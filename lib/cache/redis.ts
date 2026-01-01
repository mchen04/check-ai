/**
 * Redis Client using Upstash
 * Serverless-compatible Redis for caching and rate limiting
 */

import { Redis } from '@upstash/redis';

// =============================================================================
// REDIS CLIENT
// =============================================================================

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('Redis not configured - caching disabled');
    return null;
  }

  redisClient = new Redis({
    url,
    token,
  });

  return redisClient;
}

// =============================================================================
// CACHE HELPERS
// =============================================================================

/**
 * Get a value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const value = await redis.get<T>(key);
    return value;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set a value in cache with optional TTL
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, value);
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
    return false;
  }
}

/**
 * Delete a value from cache
 */
export async function cacheDelete(key: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Cache delete error:', error);
    return false;
  }
}

/**
 * Delete multiple keys matching a pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    // Note: SCAN with pattern matching for deletion
    // Use simple approach - get all matching keys first
    const allKeys = await redis.keys(pattern);

    if (allKeys.length > 0) {
      await redis.del(...allKeys);
    }

    return true;
  } catch (error) {
    console.error('Cache delete pattern error:', error);
    return false;
  }
}

/**
 * Increment a counter (for rate limiting)
 */
export async function cacheIncrement(key: string, ttlSeconds?: number): Promise<number | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const count = await redis.incr(key);

    // Set TTL on first increment
    if (count === 1 && ttlSeconds) {
      await redis.expire(key, ttlSeconds);
    }

    return count;
  } catch (error) {
    console.error('Cache increment error:', error);
    return null;
  }
}

/**
 * Get TTL for a key
 */
export async function cacheTTL(key: string): Promise<number | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const ttl = await redis.ttl(key);
    return ttl;
  } catch (error) {
    console.error('Cache TTL error:', error);
    return null;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { Redis };
