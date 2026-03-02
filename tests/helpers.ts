/**
 * Shared test helpers and factory functions
 */

import { vi } from 'vitest';

// =============================================================================
// Organization Factory
// =============================================================================

export function createMockOrganization(overrides?: Record<string, unknown>) {
  return {
    id: 'org_test_123',
    name: 'Test Organization',
    slug: 'test-org-abc123',
    planType: 'pro' as const,
    verificationsUsed: 10,
    verificationsLimit: 25000,
    verificationRetentionDays: 30,
    dataRetentionEnabled: true,
    ...overrides,
  };
}

// =============================================================================
// Paradigm Result Factory
// =============================================================================

export function createMockParadigmResult(overrides?: Record<string, unknown>) {
  return {
    paradigm: 'semantic',
    verdict: 'true' as const,
    confidence: 0.85,
    reasoning: 'Test reasoning',
    processingTimeMs: 1200,
    provider: 'openai',
    model: 'gpt-4o',
    error: null as string | null,
    tokenUsage: { inputTokens: 100, outputTokens: 50 },
    ...overrides,
  };
}

// =============================================================================
// Chainable Drizzle Mock
// =============================================================================

export function createMockDbChain(returnValue: unknown = []) {
  const resolvedValue = Array.isArray(returnValue) ? returnValue : [returnValue];
  const chain: Record<string, unknown> = {};

  const methods = [
    'select', 'from', 'where', 'limit', 'insert', 'values',
    'returning', 'update', 'set', 'orderBy', 'offset', 'leftJoin',
    'innerJoin', 'groupBy', 'having',
  ];

  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  // Terminal operations that return the actual value
  chain.execute = vi.fn().mockResolvedValue(resolvedValue);

  // Make the chain itself thenable (for await)
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolvedValue).then(resolve);

  return chain;
}

// =============================================================================
// Escalation Context Factory
// =============================================================================

export function createMockEscalationContext(overrides?: Record<string, unknown>) {
  return {
    verificationId: 'ver_test_123',
    confidence: 0.4,
    paradigmResults: [
      createMockParadigmResult({ paradigm: 'semantic', verdict: 'true', confidence: 0.8 }),
      createMockParadigmResult({ paradigm: 'reasoning', verdict: 'false', confidence: 0.6 }),
    ],
    orgId: 'org_test_123',
    organizationName: 'Test Organization',
    content: 'Test content for verification',
    ...overrides,
  };
}

// =============================================================================
// Webhook Factory
// =============================================================================

export function createMockWebhook(overrides?: Record<string, unknown>) {
  return {
    id: 'wh_test_123',
    orgId: 'org_test_123',
    url: 'https://example.com/webhook',
    signingSecret: 'a'.repeat(64),
    events: ['verification.completed', 'verification.escalated'],
    isActive: true,
    failureCount: 0,
    lastTriggeredAt: null,
    lastStatus: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

// =============================================================================
// Batch Job Factory
// =============================================================================

export function createMockBatchJob(overrides?: Record<string, unknown>) {
  return {
    id: 'batch_test_123',
    orgId: 'org_test_123',
    name: 'Test Batch',
    status: 'pending',
    inputFormat: 'json',
    originalFileName: null,
    methodsConfig: { semantic: 1 },
    methodOverrides: null,
    verifyOptions: null,
    context: null,
    totalItems: 10,
    processedItems: 0,
    successCount: 0,
    failureCount: 0,
    totalCostCents: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    errorMessage: null,
    validationErrors: null,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date('2025-01-01'),
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

// =============================================================================
// Batch Item Factory
// =============================================================================

export function createMockBatchItem(overrides?: Record<string, unknown>) {
  return {
    id: 'item_test_123',
    batchId: 'batch_test_123',
    itemIndex: 0,
    idempotencyKey: null,
    content: 'Test content',
    itemContext: null,
    status: 'pending',
    verificationId: null,
    verdict: null,
    confidence: null,
    decision: null,
    errorMessage: null,
    costCents: null,
    processingTimeMs: null,
    completedAt: null,
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}
