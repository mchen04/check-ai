/**
 * Cache Module Index
 */

export {
  getRedisClient,
  cacheGet,
  cacheSet,
  cacheDelete,
} from './redis';

export {
  generateCacheKey,
  getCachedVerification,
  cacheVerification,
  invalidateVerification,
  recordCacheHit,
  recordCacheMiss,
  CACHE_PREFIX,
  MIN_CONFIDENCE_TO_CACHE,
} from './verification-cache';

export {
  checkRateLimit,
  cleanupInMemoryRateLimits,
  isRedisConfigured,
  type RateLimitResult,
} from './ratelimit';
