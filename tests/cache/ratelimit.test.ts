/**
 * Rate Limiting Tests
 * Tests Redis-based and in-memory rate limiting
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// Mocks
// =============================================================================

const mockLimit = vi.fn();
const mockRatelimitInstance = { limit: mockLimit };

vi.mock('@upstash/ratelimit', () => {
  class MockRatelimit {
    limit = mockLimit;
    static slidingWindow = vi.fn(() => 'sliding-window-config');
  }
  return { Ratelimit: MockRatelimit };
});

vi.mock('@upstash/redis', () => {
  class MockRedis {
    constructor(_opts: unknown) {}
  }
  return { Redis: MockRedis };
});

vi.mock('@/utils/db/schema', () => ({
  PLAN_LIMITS: {
    free: { verificationsPerMonth: 1000, allowedMethods: ['semantic', 'reasoning', 'tool', 'biprm', 'ensemble', 'entropy', 'formal'], rateLimit: { windowMs: 60000, maxRequests: 20 }, maxTeamMembers: 1, dataRetentionDays: 7, batchProcessing: false },
    pro: { verificationsPerMonth: 25000, allowedMethods: ['semantic', 'reasoning', 'tool', 'biprm', 'ensemble', 'entropy', 'formal'], rateLimit: { windowMs: 60000, maxRequests: 200 }, maxTeamMembers: 5, dataRetentionDays: 30, batchProcessing: true },
    enterprise: { verificationsPerMonth: Infinity, allowedMethods: ['semantic', 'reasoning', 'tool', 'biprm', 'ensemble', 'entropy', 'formal'], rateLimit: { windowMs: 60000, maxRequests: 1000 }, maxTeamMembers: Infinity, dataRetentionDays: 90, batchProcessing: true },
  },
}));

// Store original env
const originalEnv = { ...process.env };

// =============================================================================
// Tests
// =============================================================================

describe('rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('isRedisConfigured', () => {
    it('returns true when both env vars set', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token123';

      const { isRedisConfigured } = await import('@/lib/cache/ratelimit');
      expect(isRedisConfigured()).toBe(true);
    });

    it('returns false when URL missing', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token123';

      const { isRedisConfigured } = await import('@/lib/cache/ratelimit');
      expect(isRedisConfigured()).toBe(false);
    });

    it('returns false when token missing', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { isRedisConfigured } = await import('@/lib/cache/ratelimit');
      expect(isRedisConfigured()).toBe(false);
    });
  });

  describe('checkRateLimit — Redis path', () => {
    it('returns success/failure from Redis', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token123';

      mockLimit.mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      });

      const { checkRateLimit } = await import('@/lib/cache/ratelimit');
      const result = await checkRateLimit('org_1', 'pro');

      expect(result.success).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(99);
      expect(result.retryAfter).toBe(0);
    });

    it('returns rate limited result', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token123';

      const resetTime = Date.now() + 30000;
      mockLimit.mockResolvedValue({
        success: false,
        limit: 100,
        remaining: 0,
        reset: resetTime,
      });

      const { checkRateLimit } = await import('@/lib/cache/ratelimit');
      const result = await checkRateLimit('org_1', 'pro');

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('falls back to in-memory on Redis error', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token123';

      mockLimit.mockRejectedValue(new Error('Redis connection failed'));

      const { checkRateLimit } = await import('@/lib/cache/ratelimit');
      const result = await checkRateLimit('org_1', 'pro');

      // Should succeed (first request in-memory)
      expect(result.success).toBe(true);
      expect(result.limit).toBe(200);
    });
  });

  describe('checkRateLimit — in-memory fallback', () => {
    it('allows requests within limit', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { checkRateLimit } = await import('@/lib/cache/ratelimit');
      const result = await checkRateLimit('org_inmem', 'free');

      expect(result.success).toBe(true);
      expect(result.limit).toBe(20);
    });

    it('denies requests exceeding limit', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { checkRateLimit } = await import('@/lib/cache/ratelimit');

      // Exhaust limit (free plan: 20 requests/min)
      for (let i = 0; i < 20; i++) {
        await checkRateLimit('org_exhaust', 'free');
      }

      const result = await checkRateLimit('org_exhaust', 'free');
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('checkPublicRateLimit', () => {
    it('uses in-memory when Redis not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { checkPublicRateLimit } = await import('@/lib/cache/ratelimit');
      const result = await checkPublicRateLimit('ip:127.0.0.1', 5, 60000);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(5);
    });

    it('respects custom limits', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { checkPublicRateLimit } = await import('@/lib/cache/ratelimit');

      // Custom limit of 2
      await checkPublicRateLimit('ip:custom', 2, 60000);
      await checkPublicRateLimit('ip:custom', 2, 60000);
      const result = await checkPublicRateLimit('ip:custom', 2, 60000);

      expect(result.success).toBe(false);
    });

    it('falls back on Redis error', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token123';

      mockLimit.mockRejectedValue(new Error('Redis error'));

      const { checkPublicRateLimit } = await import('@/lib/cache/ratelimit');
      const result = await checkPublicRateLimit('ip:fallback', 5, 60000);

      expect(result.success).toBe(true);
    });
  });

  describe('cleanupInMemoryRateLimits', () => {
    it('removes expired entries', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { checkRateLimit, cleanupInMemoryRateLimits } = await import(
        '@/lib/cache/ratelimit'
      );

      // Create an entry
      await checkRateLimit('org_cleanup', 'free');

      // Cleanup shouldn't error
      cleanupInMemoryRateLimits();
    });
  });
});
