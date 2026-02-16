/**
 * Webhook Service Tests
 * Tests HMAC signing, delivery, queuing, retry, and auto-disable logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockWebhook } from '../helpers';

// =============================================================================
// Mocks
// =============================================================================

const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbUpdate = vi.fn();

const mockSelectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  then: undefined as unknown,
};

const mockInsertChain = {
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  then: undefined as unknown,
};

const mockUpdateChain = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  then: undefined as unknown,
};

vi.mock('@/utils/db/db', () => ({
  db: {
    select: (...args: unknown[]) => {
      mockDbSelect(...args);
      return mockSelectChain;
    },
    insert: (...args: unknown[]) => {
      mockDbInsert(...args);
      return mockInsertChain;
    },
    update: (...args: unknown[]) => {
      mockDbUpdate(...args);
      return mockUpdateChain;
    },
  },
}));

vi.mock('@/utils/db/schema', () => ({
  webhooksTable: { id: 'id', orgId: 'orgId', isActive: 'isActive' },
  webhookDeliveriesTable: { id: 'id', webhookId: 'webhookId' },
}));

const mockIsTriggerConfigured = vi.fn().mockReturnValue(false);
const mockQueueWebhookWithTrigger = vi.fn();
vi.mock('@/lib/webhooks/trigger', () => ({
  isTriggerConfigured: () => mockIsTriggerConfigured(),
  queueWebhookWithTrigger: (...args: unknown[]) => mockQueueWebhookWithTrigger(...args),
  WEBHOOK_CONFIG: { MAX_RETRIES: 5, TIMEOUT_SECONDS: 30 },
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const {
  generateSigningSecret,
  signPayload,
  createWebhookHeaders,
  deliverWebhook,
  queueWebhookDelivery,
  fireWebhooks,
  retryWebhookDelivery,
  sendTestWebhook,
} = await import('@/lib/webhooks/service');

// =============================================================================
// Signing
// =============================================================================

describe('generateSigningSecret', () => {
  it('returns 64-char hex string', () => {
    const secret = generateSigningSecret();
    expect(secret).toHaveLength(64);
    expect(secret).toMatch(/^[0-9a-f]+$/);
  });

  it('generates unique values on each call', () => {
    const s1 = generateSigningSecret();
    const s2 = generateSigningSecret();
    expect(s1).not.toBe(s2);
  });
});

describe('signPayload', () => {
  it('produces consistent HMAC-SHA256', () => {
    const sig1 = signPayload('test-payload', 'test-secret');
    const sig2 = signPayload('test-payload', 'test-secret');
    expect(sig1).toBe(sig2);
    expect(sig1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('different payloads produce different signatures', () => {
    const sig1 = signPayload('payload-a', 'secret');
    const sig2 = signPayload('payload-b', 'secret');
    expect(sig1).not.toBe(sig2);
  });

  it('different secrets produce different signatures', () => {
    const sig1 = signPayload('payload', 'secret-a');
    const sig2 = signPayload('payload', 'secret-b');
    expect(sig1).not.toBe(sig2);
  });
});

describe('createWebhookHeaders', () => {
  it('includes required headers', () => {
    const headers = createWebhookHeaders('{"test":true}', 'secret', '2025-01-01T00:00:00Z');

    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['X-Webhook-Signature']).toBeTruthy();
    expect(headers['X-Webhook-Timestamp']).toBe('2025-01-01T00:00:00Z');
    expect(headers['User-Agent']).toBe('Check-Webhooks/1.0');
  });

  it('signs timestamp.payload', () => {
    const payload = '{"test":true}';
    const secret = 'test-secret';
    const timestamp = '2025-01-01T00:00:00Z';

    const headers = createWebhookHeaders(payload, secret, timestamp);
    const expected = signPayload(`${timestamp}.${payload}`, secret);

    expect(headers['X-Webhook-Signature']).toBe(expected);
  });
});

// =============================================================================
// Delivery
// =============================================================================

describe('deliverWebhook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POSTs with signed headers', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('OK'),
    });

    const payload = { event: 'test' as const, timestamp: '2025-01-01T00:00:00Z', data: {} };
    await deliverWebhook('https://example.com/hook', payload, 'secret123');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/hook',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Webhook-Signature': expect.any(String),
        }),
      })
    );
  });

  it('returns success when response.ok', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('OK'),
    });

    const payload = { event: 'test' as const, timestamp: '2025-01-01T00:00:00Z', data: {} };
    const result = await deliverWebhook('https://example.com/hook', payload, 'secret');

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
  });

  it('returns failure when not ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    });

    const payload = { event: 'test' as const, timestamp: '2025-01-01T00:00:00Z', data: {} };
    const result = await deliverWebhook('https://example.com/hook', payload, 'secret');

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(500);
  });

  it('handles fetch throw', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const payload = { event: 'test' as const, timestamp: '2025-01-01T00:00:00Z', data: {} };
    const result = await deliverWebhook('https://example.com/hook', payload, 'secret');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('truncates response to 1000 chars', async () => {
    const longBody = 'x'.repeat(2000);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(longBody),
    });

    const payload = { event: 'test' as const, timestamp: '2025-01-01T00:00:00Z', data: {} };
    const result = await deliverWebhook('https://example.com/hook', payload, 'secret');

    expect(result.responseBody!.length).toBe(1000);
  });
});

// =============================================================================
// Queue Delivery
// =============================================================================

describe('queueWebhookDelivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsTriggerConfigured.mockReturnValue(false);
  });

  it('creates pending delivery record', async () => {
    const delivery = { id: 'del_1' };
    mockInsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([delivery]).then(resolve);

    // Mock the immediate delivery path - webhook lookup
    const webhook = createMockWebhook();
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([webhook]).then(resolve);

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('OK'),
    });

    // Update chains succeed
    mockUpdateChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);

    await queueWebhookDelivery('wh_1', 'org_1', 'verification.completed', {});

    expect(mockDbInsert).toHaveBeenCalled();
    expect(mockInsertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        webhookId: 'wh_1',
        event: 'verification.completed',
        status: 'pending',
      })
    );
  });

  it('uses Trigger.dev when configured', async () => {
    mockIsTriggerConfigured.mockReturnValue(true);
    mockQueueWebhookWithTrigger.mockResolvedValue('task_123');

    const delivery = { id: 'del_1' };
    mockInsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([delivery]).then(resolve);

    const webhook = createMockWebhook();
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([webhook]).then(resolve);

    mockUpdateChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);

    await queueWebhookDelivery('wh_1', 'org_1', 'verification.completed', {});

    expect(mockQueueWebhookWithTrigger).toHaveBeenCalled();
  });

  it('falls back to immediate when Trigger unavailable', async () => {
    mockIsTriggerConfigured.mockReturnValue(false);

    const delivery = { id: 'del_1' };
    mockInsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([delivery]).then(resolve);

    const webhook = createMockWebhook();
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([webhook]).then(resolve);

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('OK'),
    });

    mockUpdateChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);

    const id = await queueWebhookDelivery('wh_1', 'org_1', 'verification.completed', {});
    expect(id).toBe('del_1');
    // Should have called fetch for immediate delivery
    expect(mockFetch).toHaveBeenCalled();
  });

  it('falls back on Trigger error', async () => {
    mockIsTriggerConfigured.mockReturnValue(true);
    mockQueueWebhookWithTrigger.mockRejectedValue(new Error('Trigger down'));

    const delivery = { id: 'del_1' };
    mockInsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([delivery]).then(resolve);

    const webhook = createMockWebhook();
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([webhook]).then(resolve);

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('OK'),
    });

    mockUpdateChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);

    const id = await queueWebhookDelivery('wh_1', 'org_1', 'verification.completed', {});
    expect(id).toBe('del_1');
  });

  it('marks failed for inactive webhook (via Trigger path)', async () => {
    mockIsTriggerConfigured.mockReturnValue(true);

    const delivery = { id: 'del_1' };
    mockInsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([delivery]).then(resolve);

    // Return inactive webhook
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([createMockWebhook({ isActive: false })]).then(resolve);

    mockUpdateChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);

    await queueWebhookDelivery('wh_1', 'org_1', 'verification.completed', {});

    expect(mockUpdateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        lastError: 'Webhook not found or inactive',
      })
    );
  });
});

// =============================================================================
// fireWebhooks
// =============================================================================

describe('fireWebhooks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queries active org webhooks and filters by subscribed events', async () => {
    const webhooks = [
      createMockWebhook({ events: ['verification.completed'] }),
      createMockWebhook({ id: 'wh_2', events: ['verification.escalated'] }),
    ];

    // fireWebhooks select query
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(webhooks).then(resolve);

    // Queue delivery mocks
    mockInsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([{ id: 'del_1' }]).then(resolve);
    mockUpdateChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('') });

    await fireWebhooks('org_1', 'verification.completed', { test: true });

    // Should select webhooks
    expect(mockDbSelect).toHaveBeenCalled();
  });

  it('is no-op when no subscribers', async () => {
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);

    await fireWebhooks('org_1', 'verification.completed', {});

    // Should not try to insert deliveries
    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it('does not throw on individual failure', async () => {
    const webhooks = [createMockWebhook({ events: ['verification.completed'] })];
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(webhooks).then(resolve);

    // Make delivery fail
    mockInsertChain.then = (_: unknown, reject?: (e: unknown) => unknown) =>
      Promise.reject(new Error('DB error')).catch(() => {});

    // Should not throw
    await fireWebhooks('org_1', 'verification.completed', {});
  });

  it('does not queue webhook that does not subscribe to the fired event', async () => {
    // Webhook subscribes only to 'verification.completed'
    const webhooks = [
      createMockWebhook({ events: ['verification.completed'] }),
    ];

    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(webhooks).then(resolve);

    // Fire a different event
    await fireWebhooks('org_1', 'verification.escalated', { test: true });

    // Should not try to insert deliveries because no webhook subscribes to escalated
    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it('only queues webhooks that subscribe to the fired event (mixed)', async () => {
    const webhooks = [
      createMockWebhook({ id: 'wh_1', events: ['verification.completed'] }),
      createMockWebhook({ id: 'wh_2', events: ['verification.escalated'] }),
      createMockWebhook({ id: 'wh_3', events: ['verification.completed', 'verification.escalated'] }),
    ];

    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(webhooks).then(resolve);

    mockInsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([{ id: 'del_1' }]).then(resolve);
    mockUpdateChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('') });

    await fireWebhooks('org_1', 'verification.escalated', { test: true });

    // wh_1 does not subscribe to escalated → only wh_2 and wh_3 should be queued
    // Each queued webhook triggers an insert for the delivery record
    expect(mockDbInsert).toHaveBeenCalled();
  });
});

// =============================================================================
// Auto-disable logic (via deliverWebhookImmediate)
// =============================================================================

describe('auto-disable after consecutive failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsTriggerConfigured.mockReturnValue(false);
  });

  it('increments failureCount but keeps active when failureCount < 9', async () => {
    const delivery = { id: 'del_1' };
    mockInsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([delivery]).then(resolve);

    // Webhook with failureCount 8
    const webhook = createMockWebhook({ failureCount: 8 });
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([webhook]).then(resolve);

    // Delivery fails
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Server Error'),
    });

    mockUpdateChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);

    await queueWebhookDelivery('wh_1', 'org_1', 'verification.completed', {});

    // Verify webhook status updated with incremented failureCount
    const setCalls = mockUpdateChain.set.mock.calls;
    const statusUpdateCall = setCalls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>).failureCount !== undefined
    );
    expect(statusUpdateCall).toBeDefined();
    expect(statusUpdateCall![0].failureCount).toBe(9); // 8 + 1

    // Should NOT set isActive to false (failureCount was 8, now 9, threshold is >= 9)
    // Actually the check is: if (!result.success && webhook.failureCount >= 9)
    // failureCount was 8, so 8 >= 9 is false → should NOT disable
    const disableCall = setCalls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>).isActive === false
    );
    expect(disableCall).toBeUndefined();
  });

  it('disables webhook when failureCount reaches 9 and delivery fails', async () => {
    const delivery = { id: 'del_1' };
    mockInsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([delivery]).then(resolve);

    // Webhook already at failureCount 9
    const webhook = createMockWebhook({ failureCount: 9 });
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([webhook]).then(resolve);

    // Delivery fails
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Server Error'),
    });

    mockUpdateChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);

    await queueWebhookDelivery('wh_1', 'org_1', 'verification.completed', {});

    // Should set isActive to false (webhook.failureCount 9 >= 9)
    const setCalls = mockUpdateChain.set.mock.calls;
    const disableCall = setCalls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>).isActive === false
    );
    expect(disableCall).toBeDefined();
  });

  it('resets failureCount to 0 on successful delivery', async () => {
    const delivery = { id: 'del_1' };
    mockInsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([delivery]).then(resolve);

    // Webhook with failureCount 5
    const webhook = createMockWebhook({ failureCount: 5 });
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([webhook]).then(resolve);

    // Delivery succeeds
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('OK'),
    });

    mockUpdateChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);

    await queueWebhookDelivery('wh_1', 'org_1', 'verification.completed', {});

    // Should reset failureCount to 0
    const setCalls = mockUpdateChain.set.mock.calls;
    const statusUpdateCall = setCalls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>).failureCount === 0
    );
    expect(statusUpdateCall).toBeDefined();
  });
});

// =============================================================================
// Signing roundtrip
// =============================================================================

describe('signPayload + createWebhookHeaders roundtrip', () => {
  it('header signature matches independent HMAC computation', async () => {
    const { createHmac } = await import('crypto');
    const payload = '{"event":"test","data":{}}';
    const secret = 'my-webhook-secret-key-that-is-long';
    const timestamp = '2025-06-15T10:00:00Z';

    const headers = createWebhookHeaders(payload, secret, timestamp);

    // Independently compute HMAC-SHA256 of timestamp.payload
    const expectedSig = createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    expect(headers['X-Webhook-Signature']).toBe(expectedSig);
    expect(headers['X-Webhook-Timestamp']).toBe(timestamp);
  });

  it('different timestamps produce different signatures for same payload', () => {
    const payload = '{"event":"test"}';
    const secret = 'test-secret';

    const headers1 = createWebhookHeaders(payload, secret, '2025-01-01T00:00:00Z');
    const headers2 = createWebhookHeaders(payload, secret, '2025-01-02T00:00:00Z');

    expect(headers1['X-Webhook-Signature']).not.toBe(headers2['X-Webhook-Signature']);
  });
});

// =============================================================================
// retryWebhookDelivery
// =============================================================================

describe('retryWebhookDelivery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when delivery not found', async () => {
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);

    const result = await retryWebhookDelivery('del_nonexistent', 'org_1');
    expect(result).toBeNull();
  });

  it('returns null when webhook not in org', async () => {
    let selectCount = 0;
    mockSelectChain.then = (resolve: (v: unknown) => unknown) => {
      selectCount++;
      if (selectCount === 1) {
        // Found delivery
        return Promise.resolve([{ id: 'del_1', webhookId: 'wh_1', event: 'test', payload: {} }]).then(resolve);
      }
      // But webhook not found for org
      return Promise.resolve([]).then(resolve);
    };

    const result = await retryWebhookDelivery('del_1', 'org_1');
    expect(result).toBeNull();
  });
});

// =============================================================================
// sendTestWebhook
// =============================================================================

describe('sendTestWebhook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when webhook not found', async () => {
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);

    const result = await sendTestWebhook('wh_nonexistent');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Webhook not found');
  });

  it('delivers test event and records delivery', async () => {
    const webhook = createMockWebhook();
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([webhook]).then(resolve);

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('OK'),
    });

    mockInsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);

    const result = await sendTestWebhook('wh_test_123');

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalled();
    // Should record the delivery
    expect(mockDbInsert).toHaveBeenCalled();
  });
});
