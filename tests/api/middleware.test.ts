/**
 * API Middleware Tests
 * Tests authentication, rate limiting, quota, method checks, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { createMockOrganization } from '../helpers';

// =============================================================================
// Mocks
// =============================================================================

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue(undefined),
  then: undefined as unknown,
};
// Make chain awaitable
mockDb.then = (resolve: (v: unknown) => unknown) => Promise.resolve([]).then(resolve);

vi.mock('@/utils/db/db', () => ({ db: mockDb }));
vi.mock('@/utils/db/schema', () => ({
  apiKeysTable: { id: 'id', orgId: 'orgId', keyHash: 'keyHash', isActive: 'isActive', expiresAt: 'expiresAt', name: 'name', keyPrefix: 'keyPrefix', paradigmConfig: 'paradigmConfig', defaultThresholds: 'defaultThresholds', deletedAt: 'deletedAt', lastUsedAt: 'lastUsedAt' },
  organizationsTable: { id: 'id', name: 'name', slug: 'slug', planType: 'planType', verificationsUsed: 'verificationsUsed', verificationsLimit: 'verificationsLimit', verificationRetentionDays: 'verificationRetentionDays', dataRetentionEnabled: 'dataRetentionEnabled' },
  ALL_METHODS: ['semantic', 'reasoning', 'tool', 'biprm', 'ensemble', 'entropy', 'formal'],
  PLAN_LIMITS: {
    free: { verificationsPerMonth: 1000, allowedMethods: ['semantic', 'reasoning', 'tool', 'biprm', 'ensemble', 'entropy', 'formal'], rateLimit: { windowMs: 60000, maxRequests: 20 }, maxTeamMembers: 1, dataRetentionDays: 7, batchProcessing: false },
    pro: { verificationsPerMonth: 25000, allowedMethods: ['semantic', 'reasoning', 'tool', 'biprm', 'ensemble', 'entropy', 'formal'], rateLimit: { windowMs: 60000, maxRequests: 200 }, maxTeamMembers: 5, dataRetentionDays: 30, batchProcessing: true },
    enterprise: { verificationsPerMonth: Infinity, allowedMethods: ['semantic', 'reasoning', 'tool', 'biprm', 'ensemble', 'entropy', 'formal'], rateLimit: { windowMs: 60000, maxRequests: 1000 }, maxTeamMembers: Infinity, dataRetentionDays: 90, batchProcessing: true },
  },
}));
vi.mock('@/lib/llm', () => ({
  hashApiKey: vi.fn((key: string) => `hashed_${key}`),
}));

const mockCheckRateLimit = vi.fn();
const mockCleanup = vi.fn();
vi.mock('@/lib/cache', () => ({
  checkRateLimit: mockCheckRateLimit,
  cleanupInMemoryRateLimits: mockCleanup,
}));

vi.mock('@/lib/api/formatters', () => ({
  isDateExpired: vi.fn((date: Date | null) => {
    if (!date) return false;
    return date < new Date();
  }),
}));

vi.mock('@/lib/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/logger')>();
  return {
    ...actual,
    generateRequestId: vi.fn(() => 'req_test_123'),
  };
});

// Import after mocks
const {
  withApiAuth,
  withQuotaCheck,
  withRateLimit,
  withMethodCheck,
  withErrorHandler,
  withLogging,
  compose,
} = await import('@/lib/api/middleware');

// =============================================================================
// Helpers
// =============================================================================

function createRequest(options: {
  method?: string;
  path?: string;
  headers?: Record<string, string>;
  body?: unknown;
} = {}) {
  const { method = 'POST', path = '/api/v1/verify', headers = {}, body } = options;
  const url = `http://localhost:3000${path}`;

  const req = new NextRequest(url, {
    method,
    headers: new Headers(headers),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  return req;
}

function createAuthenticatedRequest(orgOverrides?: Record<string, unknown>) {
  const req = createRequest({
    headers: { Authorization: 'Bearer sk_test_valid_api_key_12345' },
  });
  const org = createMockOrganization(orgOverrides);
  (req as any).organization = org;
  (req as any).apiKeyId = 'key_test_123';
  (req as any).apiKeyConfig = { id: 'key_test_123', name: 'Test Key', paradigmConfig: null, defaultThresholds: null };
  return req as any;
}

const successHandler = vi.fn().mockImplementation(async () =>
  NextResponse.json({ success: true })
);

// =============================================================================
// withApiAuth
// =============================================================================

describe('withApiAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock chain's then behavior
    mockDb.then = undefined as unknown;
  });

  it('returns 401 for missing auth header', async () => {
    const handler = withApiAuth(successHandler);
    const req = createRequest();
    const res = await handler(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 for missing Bearer prefix', async () => {
    const handler = withApiAuth(successHandler);
    const req = createRequest({ headers: { Authorization: 'Token sk_test_key' } });
    const res = await handler(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(401);
  });

  it('returns 401 for empty string after Bearer prefix', async () => {
    const handler = withApiAuth(successHandler);
    const req = createRequest({ headers: { Authorization: 'Bearer ' } });
    const res = await handler(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(401);
  });

  it('returns 401 for key shorter than 20 chars', async () => {
    const handler = withApiAuth(successHandler);
    const req = createRequest({ headers: { Authorization: 'Bearer short' } });
    const res = await handler(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Invalid API key format');
  });

  it('returns 401 when key not found in DB', async () => {
    mockDb.then = (resolve: (v: unknown) => unknown) => Promise.resolve([]).then(resolve);

    const handler = withApiAuth(successHandler);
    const req = createRequest({ headers: { Authorization: 'Bearer sk_test_valid_api_key_12345' } });
    const res = await handler(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Invalid API key');
  });

  it('returns 401 for inactive key', async () => {
    let callCount = 0;
    mockDb.then = (resolve: (v: unknown) => unknown) => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve([{ id: 'key1', orgId: 'org1', name: 'Test', keyPrefix: 'sk_test', paradigmConfig: null, defaultThresholds: null, isActive: false, expiresAt: null }]).then(resolve);
      }
      return Promise.resolve([]).then(resolve);
    };

    const handler = withApiAuth(successHandler);
    const req = createRequest({ headers: { Authorization: 'Bearer sk_test_valid_api_key_12345' } });
    const res = await handler(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('inactive');
  });

  it('returns 401 for expired key', async () => {
    let callCount = 0;
    mockDb.then = (resolve: (v: unknown) => unknown) => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve([{ id: 'key1', orgId: 'org1', name: 'Test', keyPrefix: 'sk_test', paradigmConfig: null, defaultThresholds: null, isActive: true, expiresAt: new Date('2020-01-01') }]).then(resolve);
      }
      return Promise.resolve([]).then(resolve);
    };

    const handler = withApiAuth(successHandler);
    const req = createRequest({ headers: { Authorization: 'Bearer sk_test_valid_api_key_12345' } });
    const res = await handler(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('expired');
  });

  it('returns 401 when org not found', async () => {
    let callCount = 0;
    mockDb.then = (resolve: (v: unknown) => unknown) => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve([{ id: 'key1', orgId: 'org1', name: 'Test', keyPrefix: 'sk_test', paradigmConfig: null, defaultThresholds: null, isActive: true, expiresAt: null }]).then(resolve);
      }
      return Promise.resolve([]).then(resolve);
    };

    const handler = withApiAuth(successHandler);
    const req = createRequest({ headers: { Authorization: 'Bearer sk_test_valid_api_key_12345' } });
    const res = await handler(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Organization not found');
  });

  it('attaches org context and calls handler on valid key', async () => {
    const mockOrg = createMockOrganization();
    let callCount = 0;
    mockDb.then = (resolve: (v: unknown) => unknown) => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve([{ id: 'key1', orgId: mockOrg.id, name: 'Test', keyPrefix: 'sk_test', paradigmConfig: null, defaultThresholds: null, isActive: true, expiresAt: null }]).then(resolve);
      }
      if (callCount === 2) {
        return Promise.resolve([mockOrg]).then(resolve);
      }
      return Promise.resolve([]).then(resolve);
    };
    mockDb.execute.mockResolvedValue(undefined);

    const handler = withApiAuth(successHandler);
    const req = createRequest({ headers: { Authorization: 'Bearer sk_test_valid_api_key_12345' } });
    const res = await handler(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(200);
    expect(successHandler).toHaveBeenCalled();
    const calledReq = successHandler.mock.calls[0][0];
    expect(calledReq.organization.id).toBe(mockOrg.id);
    expect(calledReq.apiKeyId).toBe('key1');
  });

  it('sets X-Request-ID header on response', async () => {
    const mockOrg = createMockOrganization();
    let callCount = 0;
    mockDb.then = (resolve: (v: unknown) => unknown) => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve([{ id: 'key1', orgId: mockOrg.id, name: 'Test', keyPrefix: 'sk_test', paradigmConfig: null, defaultThresholds: null, isActive: true, expiresAt: null }]).then(resolve);
      }
      if (callCount === 2) {
        return Promise.resolve([mockOrg]).then(resolve);
      }
      return Promise.resolve([]).then(resolve);
    };

    const handler = withApiAuth(successHandler);
    const req = createRequest({ headers: { Authorization: 'Bearer sk_test_valid_api_key_12345' } });
    const res = await handler(req, { params: Promise.resolve({}) });

    expect(res.headers.get('X-Request-ID')).toBe('req_test_123');
  });
});

// =============================================================================
// withQuotaCheck
// =============================================================================

describe('withQuotaCheck', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws QuotaExceededError when quota reached', async () => {
    const handler = withQuotaCheck(successHandler);
    const req = createAuthenticatedRequest({
      verificationsUsed: 5000,
      verificationsLimit: 5000,
    });

    await expect(handler(req, { params: Promise.resolve({}) })).rejects.toThrow('exceeded');
  });

  it('passes through when under quota', async () => {
    const handler = withQuotaCheck(successHandler);
    const req = createAuthenticatedRequest({
      verificationsUsed: 10,
      verificationsLimit: 5000,
    });

    const res = await handler(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    expect(successHandler).toHaveBeenCalled();
  });

  it('rejects when exactly at limit (used == limit)', async () => {
    const handler = withQuotaCheck(successHandler);
    const req = createAuthenticatedRequest({
      verificationsUsed: 100,
      verificationsLimit: 100,
    });

    await expect(handler(req, { params: Promise.resolve({}) })).rejects.toThrow('exceeded');
  });

  it('allows when one below limit', async () => {
    const handler = withQuotaCheck(successHandler);
    const req = createAuthenticatedRequest({
      verificationsUsed: 99,
      verificationsLimit: 100,
    });

    const res = await handler(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
  });
});

// =============================================================================
// withRateLimit
// =============================================================================

describe('withRateLimit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 429 with headers when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      limit: 100,
      remaining: 0,
      reset: Date.now() + 60000,
      retryAfter: 60,
    });

    const handler = withRateLimit(successHandler);
    const req = createAuthenticatedRequest();
    const res = await handler(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(429);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('100');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(res.headers.get('Retry-After')).toBe('60');
  });

  it('adds rate limit headers on success', async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
      retryAfter: 0,
    });

    const handler = withRateLimit(successHandler);
    const req = createAuthenticatedRequest();
    const res = await handler(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('100');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('99');
  });
});

// =============================================================================
// withMethodCheck (now a pass-through since all plans have all methods)
// =============================================================================

describe('withMethodCheck', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is a pass-through that returns the same handler', () => {
    const handler = withMethodCheck(successHandler);
    expect(handler).toBe(successHandler);
  });

  it('free plan allows all 7 methods', async () => {
    const handler = withMethodCheck(successHandler);
    const req = createAuthenticatedRequest({ planType: 'free' });

    const res = await handler(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
  });

  it('pro plan allows all 7 methods', async () => {
    const handler = withMethodCheck(successHandler);
    const req = createAuthenticatedRequest({ planType: 'pro' });

    const res = await handler(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
  });
});

// =============================================================================
// withErrorHandler
// =============================================================================

describe('withErrorHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error response when handler throws', async () => {
    const throwingHandler = vi.fn().mockRejectedValue(new Error('Test error'));
    const handler = withErrorHandler(throwingHandler);
    const req = createAuthenticatedRequest();

    const res = await handler(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(500);
  });

  it('passes through successful responses', async () => {
    const handler = withErrorHandler(successHandler);
    const req = createAuthenticatedRequest();

    const res = await handler(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
  });
});

// =============================================================================
// withLogging
// =============================================================================

describe('withLogging', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls handler and returns response', async () => {
    const handler = withLogging(successHandler);
    const req = createAuthenticatedRequest();

    const res = await handler(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    expect(successHandler).toHaveBeenCalled();
  });
});

// =============================================================================
// compose
// =============================================================================

describe('compose', () => {
  it('applies middlewares right-to-left', async () => {
    const order: string[] = [];

    const mw1 = (handler: any) => async (req: any, ctx: any) => {
      order.push('mw1-before');
      const res = await handler(req, ctx);
      order.push('mw1-after');
      return res;
    };

    const mw2 = (handler: any) => async (req: any, ctx: any) => {
      order.push('mw2-before');
      const res = await handler(req, ctx);
      order.push('mw2-after');
      return res;
    };

    const composed = compose(mw1, mw2);
    const handler = composed(successHandler as any);
    const req = createAuthenticatedRequest();
    await handler(req, { params: Promise.resolve({}) });

    // mw1 wraps mw2 which wraps handler
    expect(order).toEqual(['mw1-before', 'mw2-before', 'mw2-after', 'mw1-after']);
  });
});
