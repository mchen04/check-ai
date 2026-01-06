/**
 * Redis-based Rate Limiting using @upstash/ratelimit
 * Provides distributed rate limiting for API endpoints with graceful fallback
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { PLAN_LIMITS, type PlanType } from '@/utils/db/schema';

// =============================================================================
// TYPES
// =============================================================================

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in milliseconds
  retryAfter: number; // Seconds until reset (0 if success)
}

// =============================================================================
// RATE LIMITER FACTORY
// =============================================================================

// Cache rate limiters per plan type to avoid recreation on every request
const rateLimiterCache = new Map<PlanType, Ratelimit>();

// In-memory fallback store for when Redis is unavailable
const inMemoryFallback = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if Redis is configured via environment variables
 */
export function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Get or create a rate limiter for a specific plan type
 * Uses singleton pattern to cache limiters
 */
function getRateLimiter(planType: PlanType): Ratelimit | null {
  if (!isRedisConfigured()) {
    return null;
  }

  // Return cached limiter if exists
  if (rateLimiterCache.has(planType)) {
    return rateLimiterCache.get(planType)!;
  }

  const config = PLAN_LIMITS[planType].rateLimit;

  // Create Redis client for this limiter
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  // Create rate limiter with sliding window algorithm
  // Sliding window prevents burst traffic at window boundaries
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs}ms`),
    analytics: true,
    prefix: `ratelimit:${planType}`,
  });

  rateLimiterCache.set(planType, limiter);
  return limiter;
}

// =============================================================================
// IN-MEMORY FALLBACK
// =============================================================================

/**
 * Fallback rate limiting when Redis is unavailable
 * Uses fixed window algorithm for simplicity
 */
function checkInMemoryRateLimit(
  key: string,
  config: { requests: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  let entry = inMemoryFallback.get(key);

  // Create new window if needed
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.windowMs };
    inMemoryFallback.set(key, entry);
  }

  entry.count++;

  const remaining = Math.max(0, config.requests - entry.count);
  const success = entry.count <= config.requests;
  const retryAfter = success ? 0 : Math.ceil((entry.resetAt - now) / 1000);

  return {
    success,
    limit: config.requests,
    remaining,
    reset: entry.resetAt,
    retryAfter,
  };
}

/**
 * Cleanup expired in-memory entries
 * Called lazily to avoid setInterval in serverless
 */
export function cleanupInMemoryRateLimits(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  inMemoryFallback.forEach((value, key) => {
    if (value.resetAt < now) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => inMemoryFallback.delete(key));
}

// =============================================================================
// MAIN RATE LIMIT CHECK
// =============================================================================

/**
 * Check rate limit for an organization
 *
 * @param orgId - Organization identifier
 * @param planType - Organization's plan type (free, pro, enterprise)
 * @returns Rate limit result with success status and headers info
 */
export async function checkRateLimit(
  orgId: string,
  planType: PlanType
): Promise<RateLimitResult> {
  const config = PLAN_LIMITS[planType].rateLimit;
  const key = `org:${orgId}`;

  // Try Redis-based rate limiting
  const limiter = getRateLimiter(planType);

  if (limiter) {
    try {
      const result = await limiter.limit(key);

      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        retryAfter: result.success
          ? 0
          : Math.ceil((result.reset - Date.now()) / 1000),
      };
    } catch (error) {
      // Log error and fallback to in-memory
      console.error('Redis rate limit error, falling back to in-memory:', error);
    }
  }

  // Fallback to in-memory rate limiting
  if (!limiter) {
    console.warn('Using in-memory rate limiting (Redis not configured)');
  }

  return checkInMemoryRateLimit(key, {
    requests: config.maxRequests,
    windowMs: config.windowMs,
  });
}
