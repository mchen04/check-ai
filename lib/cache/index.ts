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
  recordCacheHit,
  recordCacheMiss,
} from './verification-cache';

export {
  checkRateLimit,
  cleanupInMemoryRateLimits,
  isRedisConfigured,
  type RateLimitResult,
} from './ratelimit';
