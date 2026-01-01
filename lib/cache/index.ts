/**
 * Cache Module Index
 */

export {
    getRedisClient,
    cacheGet,
    cacheSet,
    cacheDelete,
    cacheDeletePattern,
    cacheIncrement,
    cacheTTL,
} from './redis';

export {
    generateCacheKey,
    getCachedVerification,
    cacheVerification,
    invalidateVerification,
    recordCacheHit,
    recordCacheMiss,
    getCacheStats,
    resetCacheStats,
    CACHE_PREFIX,
    MIN_CONFIDENCE_TO_CACHE,
} from './verification-cache';
