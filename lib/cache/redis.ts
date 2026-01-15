/**
 * Redis Client using Upstash
 * Serverless-compatible Redis for caching and rate limiting
 */

import { Redis } from '@upstash/redis';
import { createLogger } from '@/lib/logger';

const log = createLogger('Cache');

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
    log.warn('Redis not configured - caching disabled');
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
    log.error({ err: error, key }, 'Cache get error');
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
    log.error({ err: error, key }, 'Cache set error');
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
    log.error({ err: error, key }, 'Cache delete error');
    return false;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { Redis };
