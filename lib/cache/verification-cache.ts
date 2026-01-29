/**
 * Verification Result Caching
 * Cache verification results to avoid redundant API calls
 *
 * Uses two-layer caching strategy (server-cache-lru):
 * 1. In-memory LRU cache for hot data (fast, cross-request within same process)
 * 2. Redis cache for distributed persistence (slower, cross-instance)
 */

import crypto from 'crypto';
import { LRUCache } from 'lru-cache';
import { VerificationResult, MethodsConfig } from '@/lib/verification';
import { cacheGet, cacheSet, cacheDelete } from './redis';

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

const CACHE_PREFIX = 'verify:';

// In-memory LRU cache for hot verification results (server-cache-lru)
// This provides fast access for frequently accessed verifications without hitting Redis
const verificationLRU = new LRUCache<string, VerificationResult>({
  max: 5000, // Maximum number of cached results
  ttl: 1000 * 60 * 2, // 2 minute TTL for in-memory cache (shorter than Redis)
});

// LRU cache for generateCacheKey memoization (replaces manual Map-based LRU)
const cacheKeyMemo = new LRUCache<string, string>({
  max: 1000,
  ttl: 1000 * 60 * 5, // 5 minutes
});

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
 * Uses LRU memoization to avoid redundant SHA256 hashing for repeated calls
 */
export function generateCacheKey(content: string, methodsConfig: MethodsConfig): string {
  // Create a deterministic hash of content + config
  const configString = JSON.stringify(sortObject(methodsConfig as Record<string, unknown>));

  // Use a shorter memo key (first 100 chars of content + config)
  const memoKey = `${content.slice(0, 100)}|${configString}`;

  // Check LRU memo cache first (automatic eviction handled by lru-cache)
  const cached = cacheKeyMemo.get(memoKey);
  if (cached) {
    return cached;
  }

  // Generate hash
  const hashInput = `${content}|${configString}`;
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 32);
  const result = `${CACHE_PREFIX}${hash}`;

  // Store in LRU cache (automatic eviction when max size reached)
  cacheKeyMemo.set(memoKey, result);

  return result;
}

/**
 * Sort object keys for consistent hashing
 */
function sortObject(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(obj)
    .toSorted()
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
 * Uses two-layer cache: in-memory LRU first, then Redis (server-cache-lru)
 */
export async function getCachedVerification(
  content: string,
  methodsConfig: MethodsConfig
): Promise<VerificationResult | null> {
  const key = generateCacheKey(content, methodsConfig);

  // Layer 1: Check in-memory LRU cache first (fast, no network)
  const inMemory = verificationLRU.get(key);
  if (inMemory) {
    stats.hits++;
    return {
      ...inMemory,
      cached: true,
    };
  }

  // Layer 2: Check Redis cache (slower, distributed)
  const cached = await cacheGet<VerificationResult>(key);

  if (cached) {
    // Populate in-memory cache for future requests
    verificationLRU.set(key, cached);
    stats.hits++;
    return {
      ...cached,
      cached: true,
    };
  }

  stats.misses++;
  return null;
}

/**
 * Cache a verification result
 * Stores in both in-memory LRU and Redis for two-layer caching
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

  // Layer 1: Store in in-memory LRU (immediate availability)
  verificationLRU.set(key, resultToCache);

  // Layer 2: Store in Redis (distributed persistence)
  return await cacheSet(key, resultToCache, ttl);
}

// =============================================================================
// CACHE STATS (for monitoring)
// =============================================================================

// In-memory stats for cache hit/miss tracking
const stats = {
  hits: 0,
  misses: 0,
};

export function recordCacheHit(): void {
  stats.hits++;
}

export function recordCacheMiss(): void {
  stats.misses++;
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats(): { hits: number; misses: number; hitRate: number; lruSize: number } {
  const total = stats.hits + stats.misses;
  return {
    hits: stats.hits,
    misses: stats.misses,
    hitRate: total > 0 ? stats.hits / total : 0,
    lruSize: verificationLRU.size,
  };
}

/**
 * Clear the in-memory LRU cache (useful for testing or memory pressure)
 */
export function clearLRUCache(): void {
  verificationLRU.clear();
  cacheKeyMemo.clear();
}

