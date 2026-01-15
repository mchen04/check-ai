/**
 * Verification Result Caching
 * Cache verification results to avoid redundant API calls
 */

import crypto from 'crypto';
import { cacheGet, cacheSet, cacheDelete } from './redis';
import { VerificationResult, MethodsConfig } from '@/lib/verification/types';

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

const CACHE_PREFIX = 'verify:';

// TTL based on confidence level (higher confidence = longer cache)
const CONFIDENCE_TTL_MAP: Array<{ minConfidence: number; ttlSeconds: number }> = [
  { minConfidence: 0.95, ttlSeconds: 86400 * 7 }, // 7 days for very high confidence
  { minConfidence: 0.85, ttlSeconds: 86400 * 3 }, // 3 days for high confidence
  { minConfidence: 0.7, ttlSeconds: 86400 }, // 1 day for medium confidence
  { minConfidence: 0.5, ttlSeconds: 3600 * 6 }, // 6 hours for lower confidence
  { minConfidence: 0, ttlSeconds: 3600 }, // 1 hour for low confidence
];

// Don't cache uncertain results or errors
const MIN_CONFIDENCE_TO_CACHE = 0.5;

// =============================================================================
// CACHE KEY GENERATION
// =============================================================================

/**
 * Generate a cache key from content and methods config
 */
export function generateCacheKey(content: string, methodsConfig: MethodsConfig): string {
  // Create a deterministic hash of content + config
  const configString = JSON.stringify(sortObject(methodsConfig as Record<string, unknown>));
  const hashInput = `${content}|${configString}`;

  const hash = crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 32); // Use first 32 chars

  return `${CACHE_PREFIX}${hash}`;
}

/**
 * Sort object keys for consistent hashing
 */
function sortObject(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(obj)
    .sort()
    .reduce(
      (sorted, key) => {
        sorted[key] = obj[key];
        return sorted;
      },
      {} as Record<string, unknown>
    );
}

/**
 * Calculate TTL based on confidence
 */
function calculateTTL(confidence: number): number {
  for (const { minConfidence, ttlSeconds } of CONFIDENCE_TTL_MAP) {
    if (confidence >= minConfidence) {
      return ttlSeconds;
    }
  }
  return CONFIDENCE_TTL_MAP[CONFIDENCE_TTL_MAP.length - 1].ttlSeconds;
}

// =============================================================================
// CACHE OPERATIONS
// =============================================================================

/**
 * Try to get a cached verification result
 */
export async function getCachedVerification(
  content: string,
  methodsConfig: MethodsConfig
): Promise<VerificationResult | null> {
  const key = generateCacheKey(content, methodsConfig);

  const cached = await cacheGet<VerificationResult>(key);

  if (cached) {
    // Mark as cached in the result
    return {
      ...cached,
      cached: true,
    };
  }

  return null;
}

/**
 * Cache a verification result
 */
export async function cacheVerification(
  content: string,
  methodsConfig: MethodsConfig,
  result: VerificationResult
): Promise<boolean> {
  // Don't cache low-confidence or uncertain results
  if (
    result.confidence < MIN_CONFIDENCE_TO_CACHE ||
    result.verdict === 'uncertain' ||
    result.status === 'failed' ||
    result.status === 'escalated'
  ) {
    return false;
  }

  const key = generateCacheKey(content, methodsConfig);
  const ttl = calculateTTL(result.confidence);

  // Store result with cached flag set to false (it wasn't cached when generated)
  const resultToCache = {
    ...result,
    cached: false,
  };

  return await cacheSet(key, resultToCache, ttl);
}

/**
 * Invalidate a cached verification
 */
export async function invalidateVerification(
  content: string,
  methodsConfig: MethodsConfig
): Promise<boolean> {
  const key = generateCacheKey(content, methodsConfig);
  return await cacheDelete(key);
}

// =============================================================================
// CACHE STATS (for monitoring)
// =============================================================================

// In-memory stats for cache hit/miss tracking
let stats = {
  hits: 0,
  misses: 0,
};

export function recordCacheHit(): void {
  stats.hits++;
}

export function recordCacheMiss(): void {
  stats.misses++;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { CACHE_PREFIX, MIN_CONFIDENCE_TO_CACHE };
