/**
 * Verification Service Tests
 * Tests main verification flow, caching, method resolution, and formatting
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockOrganization, createMockParadigmResult } from '../helpers';

// =============================================================================
// Mocks
// =============================================================================

const mockGetCachedVerification = vi.fn().mockResolvedValue(null);
const mockCacheVerification = vi.fn().mockResolvedValue(undefined);
const mockRecordCacheHit = vi.fn();
const mockRecordCacheMiss = vi.fn();
vi.mock('@/lib/cache', () => ({
  getCachedVerification: (...args: unknown[]) => mockGetCachedVerification(...args),
  cacheVerification: (...args: unknown[]) => mockCacheVerification(...args),
  recordCacheHit: () => mockRecordCacheHit(),
  recordCacheMiss: () => mockRecordCacheMiss(),
}));

const mockGetDecryptedApiKeys = vi.fn().mockResolvedValue({ openai: 'sk-test' });
vi.mock('@/lib/llm', () => ({
  getDecryptedApiKeys: (...args: unknown[]) => mockGetDecryptedApiKeys(...args),
}));

const mockCreateEscalation = vi.fn().mockResolvedValue({ id: 'esc_1' });
vi.mock('@/lib/escalation', () => ({
  createEscalation: (...args: unknown[]) => mockCreateEscalation(...args),
}));

const mockFireWebhooks = vi.fn();
vi.mock('@/lib/webhooks', () => ({
  fireWebhooks: (...args: unknown[]) => mockFireWebhooks(...args),
}));

vi.mock('@/utils/supabase/realtime', () => ({
  broadcastStatusUpdate: vi.fn(),
  broadcastParadigmComplete: vi.fn(),
  broadcastFinalResult: vi.fn(),
}));

const mockVerifyWithUpdates = vi.fn();
vi.mock('@/lib/verification/orchestrator', () => {
  return {
    StreamingVerificationOrchestrator: class MockOrchestrator {
      setVerificationId = vi.fn();
      setUpdateCallback = vi.fn();
      verifyWithUpdates = (...args: unknown[]) => mockVerifyWithUpdates(...args);
    },
  };
});

const mockCreateVerification = vi.fn().mockResolvedValue({ id: 'ver_test_123' });
const mockFindByIdempotencyKey = vi.fn().mockResolvedValue(null);
const mockMarkVerificationFailed = vi.fn().mockResolvedValue(undefined);
const mockSaveVerificationResult = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/verification/repository', () => ({
  createVerification: (...args: unknown[]) => mockCreateVerification(...args),
  findByIdempotencyKey: (...args: unknown[]) => mockFindByIdempotencyKey(...args),
  markVerificationFailed: (...args: unknown[]) => mockMarkVerificationFailed(...args),
  saveVerificationResult: (...args: unknown[]) => mockSaveVerificationResult(...args),
}));

const mockCheckMethodsAllowed = vi.fn().mockReturnValue({ allowed: true });
const mockCheckMonthlyQuota = vi.fn().mockResolvedValue({ allowed: true });
vi.mock('@/lib/verification/quota', () => ({
  checkMethodsAllowed: (...args: unknown[]) => mockCheckMethodsAllowed(...args),
  checkMonthlyQuota: (...args: unknown[]) => mockCheckMonthlyQuota(...args),
}));

const mockGetMethodsCount = vi.fn().mockReturnValue(2);
vi.mock('@/lib/verification/validator', () => ({
  getMethodsCount: (...args: unknown[]) => mockGetMethodsCount(...args),
}));

const { verify } = await import('@/lib/verification/service');

// =============================================================================
// Helpers
// =============================================================================

function createServiceRequest(overrides?: Record<string, unknown>) {
  return {
    organization: {
      id: 'org_test_123',
      name: 'Test Org',
      planType: 'pro' as const,
      dataRetentionEnabled: true,
      verificationRetentionDays: 90,
    },
    request: {
      content: 'The Earth revolves around the Sun.',
      methods: { semantic: 1, reasoning: 1 },
      ...((overrides?.request as Record<string, unknown>) || {}),
    },
    ...overrides,
  };
}

function setupOrchestratorResult(decision = 'accept' as const) {
  mockVerifyWithUpdates.mockResolvedValue({
    verdict: 'true',
    confidence: 0.92,
    decision,
    reasoning: 'All methods agree content is true',
    paradigmResults: [
      createMockParadigmResult({ paradigm: 'semantic' }),
      createMockParadigmResult({ paradigm: 'reasoning' }),
    ],
    processingTimeMs: 2500,
    costCents: 0.5,
  });
}

// =============================================================================
// Method resolution
// =============================================================================

function resetMocks() {
  vi.clearAllMocks();
  mockCheckMethodsAllowed.mockReturnValue({ allowed: true });
  mockCheckMonthlyQuota.mockResolvedValue({ allowed: true });
  mockGetDecryptedApiKeys.mockResolvedValue({ openai: 'sk-test' });
  mockGetCachedVerification.mockResolvedValue(null);
  mockFindByIdempotencyKey.mockResolvedValue(null);
  mockCacheVerification.mockResolvedValue(undefined);
  mockCreateVerification.mockResolvedValue({ id: 'ver_test_123' });
  mockSaveVerificationResult.mockResolvedValue(undefined);
  mockMarkVerificationFailed.mockResolvedValue(undefined);
  mockGetMethodsCount.mockReturnValue(2);
  setupOrchestratorResult();
}

describe('verify — method resolution', () => {
  beforeEach(() => resetMocks());

  it('uses request methods when provided', async () => {
    const input = createServiceRequest();
    const result = await verify(input as any);

    expect(result.success).toBe(true);
    expect(mockCheckMethodsAllowed).toHaveBeenCalledWith(
      { semantic: 1, reasoning: 1 },
      expect.any(String)
    );
  });

  it('falls back to API key paradigmConfig', async () => {
    const input = createServiceRequest({
      request: { content: 'test', methods: {} },
      apiKeyConfig: {
        id: 'key_1',
        name: 'Test',
        paradigmConfig: {
          semantic: { enabled: true, weight: 1 },
          reasoning: { enabled: true, weight: 0.5 },
          tool: { enabled: false, weight: 0 },
        },
        defaultThresholds: null,
      },
    });

    const result = await verify(input as any);
    expect(result.success).toBe(true);
    expect(mockCheckMethodsAllowed).toHaveBeenCalledWith(
      expect.objectContaining({ semantic: 1, reasoning: 0.5 }),
      expect.any(String)
    );
  });

  it('errors when no methods configured', async () => {
    const input = createServiceRequest({
      request: { content: 'test', methods: {} },
    });

    const result = await verify(input as any);
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.type).toBe('methods_not_allowed');
  });

  it('excludes disabled paradigms from apiKeyConfig', async () => {
    const input = createServiceRequest({
      request: { content: 'test', methods: {} },
      apiKeyConfig: {
        id: 'key_1',
        name: 'Test',
        paradigmConfig: {
          semantic: { enabled: false, weight: 1 },
          reasoning: { enabled: true, weight: 0.8 },
        },
        defaultThresholds: null,
      },
    });

    const result = await verify(input as any);
    expect(result.success).toBe(true);
    // Should only include reasoning (semantic is disabled)
    expect(mockCheckMethodsAllowed).toHaveBeenCalledWith(
      expect.objectContaining({ reasoning: 0.8 }),
      expect.any(String)
    );
    const calledMethods = mockCheckMethodsAllowed.mock.calls[0][0];
    expect(calledMethods).not.toHaveProperty('semantic');
  });

  it('excludes zero-weight paradigms from apiKeyConfig', async () => {
    const input = createServiceRequest({
      request: { content: 'test', methods: {} },
      apiKeyConfig: {
        id: 'key_1',
        name: 'Test',
        paradigmConfig: {
          semantic: { enabled: true, weight: 0 },
          reasoning: { enabled: true, weight: 1 },
        },
        defaultThresholds: null,
      },
    });

    const result = await verify(input as any);
    expect(result.success).toBe(true);
    const calledMethods = mockCheckMethodsAllowed.mock.calls[0][0];
    expect(calledMethods).not.toHaveProperty('semantic');
    expect(calledMethods.reasoning).toBe(1);
  });

  it('request methods take priority over apiKeyConfig', async () => {
    const input = createServiceRequest({
      request: { content: 'test', methods: { semantic: 1, tool: 0.5 } },
      apiKeyConfig: {
        id: 'key_1',
        name: 'Test',
        paradigmConfig: {
          reasoning: { enabled: true, weight: 1 },
        },
        defaultThresholds: null,
      },
    });

    const result = await verify(input as any);
    expect(result.success).toBe(true);
    // Should use request methods, not apiKeyConfig
    expect(mockCheckMethodsAllowed).toHaveBeenCalledWith(
      { semantic: 1, tool: 0.5 },
      expect.any(String)
    );
  });

  it('methods: undefined falls back to apiKeyConfig', async () => {
    const input = createServiceRequest({
      request: { content: 'test' },
      apiKeyConfig: {
        id: 'key_1',
        name: 'Test',
        paradigmConfig: {
          formal: { enabled: true, weight: 0.7 },
        },
        defaultThresholds: null,
      },
    });

    const result = await verify(input as any);
    expect(result.success).toBe(true);
    expect(mockCheckMethodsAllowed).toHaveBeenCalledWith(
      expect.objectContaining({ formal: 0.7 }),
      expect.any(String)
    );
  });
});

// =============================================================================
// Plan checks
// =============================================================================

describe('verify — plan checks', () => {
  beforeEach(() => resetMocks());

  it('errors when methods not allowed', async () => {
    mockCheckMethodsAllowed.mockReturnValue({
      allowed: false,
      disallowedMethods: ['formal'],
    });

    const input = createServiceRequest();
    const result = await verify(input as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('methods_not_allowed');
    }
  });

  it('errors when quota exceeded', async () => {
    mockCheckMonthlyQuota.mockResolvedValue({
      allowed: false,
      error: 'Monthly quota exceeded',
      currentCount: 100,
      limit: 100,
    });

    const input = createServiceRequest();
    const result = await verify(input as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('quota_exceeded');
    }
  });
});

// =============================================================================
// Caching
// =============================================================================

describe('verify — caching', () => {
  beforeEach(() => resetMocks());

  it('returns cached for idempotency key match', async () => {
    mockFindByIdempotencyKey.mockResolvedValue({
      id: 'ver_cached',
      status: 'completed',
      verdict: 'true',
      confidence: 0.9,
      decision: 'accept',
      paradigmResults: [createMockParadigmResult()],
      processingTimeMs: 1000,
      costCents: 0.5,
    });

    const input = createServiceRequest({
      request: { content: 'test', methods: { semantic: 1 }, idempotencyKey: 'idem_123' },
    });

    const result = await verify(input as any);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cached).toBe(true);
      expect(result.data.id).toBe('ver_cached');
    }
    expect(mockRecordCacheHit).toHaveBeenCalled();
  });

  it('returns cached for Redis content match', async () => {
    mockGetCachedVerification.mockResolvedValue({
      id: 'ver_redis_cached',
      verdict: 'true',
      confidence: 0.88,
      decision: 'accept',
      reasoning: 'cached',
      paradigmResults: [createMockParadigmResult()],
      processingTimeMs: 800,
      costCents: 0.3,
    });

    const input = createServiceRequest();
    const result = await verify(input as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cached).toBe(true);
      expect(result.data.escalated).toBe(false);
    }
    expect(mockRecordCacheHit).toHaveBeenCalled();
  });

  it('records cache miss on fresh verification', async () => {
    const input = createServiceRequest();
    await verify(input as any);

    expect(mockRecordCacheMiss).toHaveBeenCalled();
  });
});

// =============================================================================
// Execution
// =============================================================================

describe('verify — execution', () => {
  beforeEach(() => resetMocks());

  it('creates verification record with correct expiry', async () => {
    const input = createServiceRequest();
    await verify(input as any);

    expect(mockCreateVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org_test_123',
        content: 'The Earth revolves around the Sun.',
        expiresAt: expect.any(Date),
      })
    );
  });

  it('creates with null expiresAt when retention disabled', async () => {
    const input = createServiceRequest({
      organization: {
        id: 'org_1',
        name: 'Test',
        planType: 'pro',
        dataRetentionEnabled: false,
        verificationRetentionDays: 90,
      },
    });
    await verify(input as any);

    expect(mockCreateVerification).toHaveBeenCalledWith(
      expect.objectContaining({ expiresAt: null })
    );
  });

  it('caches result after success', async () => {
    const input = createServiceRequest();
    await verify(input as any);

    expect(mockCacheVerification).toHaveBeenCalled();
  });

  it('fires completed webhook', async () => {
    const input = createServiceRequest();
    await verify(input as any);

    expect(mockFireWebhooks).toHaveBeenCalledWith(
      'org_test_123',
      'verification.completed',
      expect.objectContaining({
        verificationId: 'ver_test_123',
        verdict: 'true',
      })
    );
  });

  it('fires escalated webhook when decision=escalate', async () => {
    setupOrchestratorResult('escalate' as any);
    const input = createServiceRequest();
    await verify(input as any);

    expect(mockFireWebhooks).toHaveBeenCalledWith(
      'org_test_123',
      'verification.escalated',
      expect.objectContaining({ verificationId: 'ver_test_123' })
    );
  });

  it('creates escalation when decision=escalate', async () => {
    setupOrchestratorResult('escalate' as any);
    const input = createServiceRequest();
    await verify(input as any);

    expect(mockCreateEscalation).toHaveBeenCalledWith(
      expect.objectContaining({
        verificationId: 'ver_test_123',
        orgId: 'org_test_123',
      })
    );
  });

  it('marks failed on error', async () => {
    mockVerifyWithUpdates.mockRejectedValue(new Error('Orchestrator crashed'));

    const input = createServiceRequest();
    const result = await verify(input as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('verification_failed');
    }
    expect(mockMarkVerificationFailed).toHaveBeenCalledWith('ver_test_123');
  });

  it('returns no_api_keys when no keys configured', async () => {
    mockGetDecryptedApiKeys.mockResolvedValue({});

    const input = createServiceRequest();
    const result = await verify(input as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('no_api_keys');
    }
  });

  it('computes expiresAt as now + retentionDays * 86400000', async () => {
    const retentionDays = 30;
    const before = Date.now();
    const input = createServiceRequest({
      organization: {
        id: 'org_1',
        name: 'Test',
        planType: 'pro',
        dataRetentionEnabled: true,
        verificationRetentionDays: retentionDays,
      },
    });
    await verify(input as any);
    const after = Date.now();

    const callArgs = mockCreateVerification.mock.calls[0][0];
    const expiresAt = callArgs.expiresAt as Date;
    expect(expiresAt).toBeInstanceOf(Date);
    const expectedMin = before + retentionDays * 24 * 60 * 60 * 1000;
    const expectedMax = after + retentionDays * 24 * 60 * 60 * 1000;
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
  });
});

// =============================================================================
// Formatting (tested via verify() output paths)
// =============================================================================

describe('verify — formatParadigmResults (via execution)', () => {
  beforeEach(() => resetMocks());

  it('parses string confidence to float', async () => {
    mockVerifyWithUpdates.mockResolvedValue({
      verdict: 'true',
      confidence: 0.9,
      decision: 'accept',
      reasoning: 'ok',
      paradigmResults: [
        createMockParadigmResult({ paradigm: 'semantic', confidence: '0.85' }),
      ],
      processingTimeMs: 100,
      costCents: 0.1,
    });

    const input = createServiceRequest();
    const result = await verify(input as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paradigmResults[0].confidence).toBe(0.85);
      expect(typeof result.data.paradigmResults[0].confidence).toBe('number');
    }
  });

  it('defaults null confidence to 0', async () => {
    mockVerifyWithUpdates.mockResolvedValue({
      verdict: 'true',
      confidence: 0.9,
      decision: 'accept',
      reasoning: 'ok',
      paradigmResults: [
        createMockParadigmResult({ paradigm: 'semantic', confidence: null }),
      ],
      processingTimeMs: 100,
      costCents: 0.1,
    });

    const input = createServiceRequest();
    const result = await verify(input as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paradigmResults[0].confidence).toBe(0);
    }
  });

  it('truncates reasoning longer than 500 chars', async () => {
    const longReasoning = 'x'.repeat(600);
    mockVerifyWithUpdates.mockResolvedValue({
      verdict: 'true',
      confidence: 0.9,
      decision: 'accept',
      reasoning: 'ok',
      paradigmResults: [
        createMockParadigmResult({ paradigm: 'semantic', reasoning: longReasoning }),
      ],
      processingTimeMs: 100,
      costCents: 0.1,
    });

    const input = createServiceRequest();
    const result = await verify(input as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paradigmResults[0].reasoning!.length).toBe(500);
    }
  });

  it('converts null reasoning to undefined', async () => {
    mockVerifyWithUpdates.mockResolvedValue({
      verdict: 'true',
      confidence: 0.9,
      decision: 'accept',
      reasoning: 'ok',
      paradigmResults: [
        createMockParadigmResult({ paradigm: 'semantic', reasoning: null }),
      ],
      processingTimeMs: 100,
      costCents: 0.1,
    });

    const input = createServiceRequest();
    const result = await verify(input as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paradigmResults[0].reasoning).toBeUndefined();
    }
  });

  it('defaults null processingTimeMs to 0', async () => {
    mockVerifyWithUpdates.mockResolvedValue({
      verdict: 'true',
      confidence: 0.9,
      decision: 'accept',
      reasoning: 'ok',
      paradigmResults: [
        createMockParadigmResult({ paradigm: 'semantic', processingTimeMs: null }),
      ],
      processingTimeMs: 100,
      costCents: 0.1,
    });

    const input = createServiceRequest();
    const result = await verify(input as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paradigmResults[0].processingTimeMs).toBe(0);
    }
  });

  it('converts null error to undefined', async () => {
    mockVerifyWithUpdates.mockResolvedValue({
      verdict: 'true',
      confidence: 0.9,
      decision: 'accept',
      reasoning: 'ok',
      paradigmResults: [
        createMockParadigmResult({ paradigm: 'semantic', error: null }),
      ],
      processingTimeMs: 100,
      costCents: 0.1,
    });

    const input = createServiceRequest();
    const result = await verify(input as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paradigmResults[0].error).toBeUndefined();
    }
  });
});

describe('verify — formatCachedResponse (via idempotency cache path)', () => {
  beforeEach(() => resetMocks());

  it('maps status: escalated → escalated=true', async () => {
    mockFindByIdempotencyKey.mockResolvedValue({
      id: 'ver_cached',
      status: 'escalated',
      verdict: 'uncertain',
      confidence: 0.3,
      decision: 'escalate',
      paradigmResults: [createMockParadigmResult()],
      processingTimeMs: 2000,
      costCents: 1,
    });

    const input = createServiceRequest({
      request: { content: 'test', methods: { semantic: 1 }, idempotencyKey: 'idem_esc' },
    });

    const result = await verify(input as any);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.escalated).toBe(true);
      expect(result.data.status).toBe('escalated');
    }
  });

  it('defaults null confidence to 0 and null decision to reject', async () => {
    mockFindByIdempotencyKey.mockResolvedValue({
      id: 'ver_cached',
      status: 'completed',
      verdict: null,
      confidence: null,
      decision: null,
      paradigmResults: [],
      processingTimeMs: null,
      costCents: null,
    });

    const input = createServiceRequest({
      request: { content: 'test', methods: { semantic: 1 }, idempotencyKey: 'idem_null' },
    });

    const result = await verify(input as any);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.confidence).toBe(0);
      expect(result.data.decision).toBe('reject');
      expect(result.data.processingTimeMs).toBe(0);
      expect(result.data.costCents).toBe(0);
    }
  });
});

describe('verify — formatRedisCachedResponse (via Redis cache path)', () => {
  beforeEach(() => resetMocks());

  it('always sets escalated=false and cached=true', async () => {
    mockGetCachedVerification.mockResolvedValue({
      id: 'ver_redis',
      verdict: 'false',
      confidence: 0.95,
      decision: 'reject',
      reasoning: 'content is false',
      paradigmResults: [createMockParadigmResult()],
      processingTimeMs: 500,
      costCents: 0.2,
    });

    const input = createServiceRequest();
    const result = await verify(input as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.escalated).toBe(false);
      expect(result.data.cached).toBe(true);
      expect(result.data.status).toBe('completed');
    }
  });
});
