/**
 * Tests for API Types and Schemas
 * Tests for request/response validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
  verifyRequestSchema,
  createBatchSchema,
  createWebhookSchema,
} from './types';

// =============================================================================
// verifyRequestSchema TESTS
// =============================================================================

describe('verifyRequestSchema', () => {
  describe('content field', () => {
    it('should accept valid content', () => {
      const result = verifyRequestSchema.safeParse({
        content: 'This is a valid claim to verify.',
        methods: { reasoning: 1.0 },
      });

      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const result = verifyRequestSchema.safeParse({
        content: '',
        methods: { reasoning: 1.0 },
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing content', () => {
      const result = verifyRequestSchema.safeParse({
        methods: { reasoning: 1.0 },
      });

      expect(result.success).toBe(false);
    });

    it('should reject content over 50000 characters', () => {
      const result = verifyRequestSchema.safeParse({
        content: 'x'.repeat(50001),
        methods: { reasoning: 1.0 },
      });

      expect(result.success).toBe(false);
    });

    it('should accept content at max length', () => {
      const result = verifyRequestSchema.safeParse({
        content: 'x'.repeat(50000),
        methods: { reasoning: 1.0 },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('methods field', () => {
    it('should accept valid methods', () => {
      const result = verifyRequestSchema.safeParse({
        content: 'Test content',
        methods: { reasoning: 1.0, tool: 0.8 },
      });

      expect(result.success).toBe(true);
    });

    it('should accept all paradigm types', () => {
      const result = verifyRequestSchema.safeParse({
        content: 'Test content',
        methods: {
          semantic: 0.5,
          reasoning: 1.0,
          tool: 0.8,
          biprm: 0.6,
          ensemble: 0.9,
          entropy: 0.4,
          formal: 1.0,
        },
      });

      expect(result.success).toBe(true);
    });

    it('should reject weights over 1', () => {
      const result = verifyRequestSchema.safeParse({
        content: 'Test content',
        methods: { reasoning: 1.5 },
      });

      expect(result.success).toBe(false);
    });

    it('should reject negative weights', () => {
      const result = verifyRequestSchema.safeParse({
        content: 'Test content',
        methods: { reasoning: -0.1 },
      });

      expect(result.success).toBe(false);
    });

    it('should require at least one method', () => {
      const result = verifyRequestSchema.safeParse({
        content: 'Test content',
        methods: {},
      });

      expect(result.success).toBe(false);
    });
  });

  describe('context field', () => {
    it('should accept valid context', () => {
      const result = verifyRequestSchema.safeParse({
        content: 'Test content',
        methods: { reasoning: 1.0 },
        context: { source: 'test', metadata: { key: 'value' } },
      });

      expect(result.success).toBe(true);
    });

    it('should allow omitting context', () => {
      const result = verifyRequestSchema.safeParse({
        content: 'Test content',
        methods: { reasoning: 1.0 },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('options field', () => {
    it('should accept valid timeout', () => {
      const result = verifyRequestSchema.safeParse({
        content: 'Test content',
        methods: { reasoning: 1.0 },
        options: { timeout: 30000 },
      });

      expect(result.success).toBe(true);
    });

    it('should reject timeout below minimum', () => {
      const result = verifyRequestSchema.safeParse({
        content: 'Test content',
        methods: { reasoning: 1.0 },
        options: { timeout: 500 },
      });

      expect(result.success).toBe(false);
    });

    it('should reject timeout above maximum', () => {
      const result = verifyRequestSchema.safeParse({
        content: 'Test content',
        methods: { reasoning: 1.0 },
        options: { timeout: 400000 },
      });

      expect(result.success).toBe(false);
    });

    it('should accept valid confidence thresholds', () => {
      const result = verifyRequestSchema.safeParse({
        content: 'Test content',
        methods: { reasoning: 1.0 },
        options: {
          minConfidence: 0.8,
          acceptThreshold: 0.9,
          escalateThreshold: 0.4,
        },
      });

      expect(result.success).toBe(true);
    });

    it('should accept valid retry options', () => {
      const result = verifyRequestSchema.safeParse({
        content: 'Test content',
        methods: { reasoning: 1.0 },
        options: {
          maxRetries: 3,
          minConfidence: 0.8,
          retryOnLowConfidence: true,
        },
      });

      expect(result.success).toBe(true);
    });

    it('should reject maxRetries over 5', () => {
      const result = verifyRequestSchema.safeParse({
        content: 'Test content',
        methods: { reasoning: 1.0 },
        options: { maxRetries: 10 },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('idempotencyKey field', () => {
    it('should accept valid idempotency key', () => {
      const result = verifyRequestSchema.safeParse({
        content: 'Test content',
        methods: { reasoning: 1.0 },
        idempotencyKey: 'unique-key-123',
      });

      expect(result.success).toBe(true);
    });

    it('should reject idempotency key over 255 characters', () => {
      const result = verifyRequestSchema.safeParse({
        content: 'Test content',
        methods: { reasoning: 1.0 },
        idempotencyKey: 'k'.repeat(256),
      });

      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// createBatchSchema TESTS
// =============================================================================

describe('createBatchSchema', () => {
  it('should accept valid batch request', () => {
    const result = createBatchSchema.safeParse({
      items: [
        { content: 'Claim 1' },
        { content: 'Claim 2' },
        { content: 'Claim 3' },
      ],
      methods: { reasoning: 1.0 },
    });

    expect(result.success).toBe(true);
  });

  it('should accept batch with name', () => {
    const result = createBatchSchema.safeParse({
      name: 'Test Batch',
      items: [{ content: 'Claim 1' }],
      methods: { reasoning: 1.0 },
    });

    expect(result.success).toBe(true);
  });

  it('should accept batch with webhookUrl', () => {
    const result = createBatchSchema.safeParse({
      items: [{ content: 'Claim 1' }],
      methods: { reasoning: 1.0 },
      webhookUrl: 'https://example.com/webhook',
    });

    expect(result.success).toBe(true);
  });

  it('should reject empty items array', () => {
    const result = createBatchSchema.safeParse({
      items: [],
      methods: { reasoning: 1.0 },
    });

    expect(result.success).toBe(false);
  });

  it('should reject more than 100 items', () => {
    const items = Array.from({ length: 101 }, (_, i) => ({
      content: `Claim ${i}`,
    }));

    const result = createBatchSchema.safeParse({
      items,
      methods: { reasoning: 1.0 },
    });

    expect(result.success).toBe(false);
  });

  it('should accept exactly 100 items', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      content: `Claim ${i}`,
    }));

    const result = createBatchSchema.safeParse({
      items,
      methods: { reasoning: 1.0 },
    });

    expect(result.success).toBe(true);
  });

  it('should reject items with empty content', () => {
    const result = createBatchSchema.safeParse({
      items: [{ content: '' }],
      methods: { reasoning: 1.0 },
    });

    expect(result.success).toBe(false);
  });

  it('should reject items with content over 50000 characters', () => {
    const result = createBatchSchema.safeParse({
      items: [{ content: 'x'.repeat(50001) }],
      methods: { reasoning: 1.0 },
    });

    expect(result.success).toBe(false);
  });

  it('should accept items with context', () => {
    const result = createBatchSchema.safeParse({
      items: [
        { content: 'Claim 1', context: { source: 'test' } },
      ],
      methods: { reasoning: 1.0 },
    });

    expect(result.success).toBe(true);
  });

  it('should accept items with idempotencyKey', () => {
    const result = createBatchSchema.safeParse({
      items: [
        { content: 'Claim 1', idempotencyKey: 'key-1' },
      ],
      methods: { reasoning: 1.0 },
    });

    expect(result.success).toBe(true);
  });

  it('should reject name over 255 characters', () => {
    const result = createBatchSchema.safeParse({
      name: 'n'.repeat(256),
      items: [{ content: 'Claim 1' }],
      methods: { reasoning: 1.0 },
    });

    expect(result.success).toBe(false);
  });

  it('should accept batch options', () => {
    const result = createBatchSchema.safeParse({
      items: [{ content: 'Claim 1' }],
      methods: { reasoning: 1.0 },
      options: {
        timeout: 60000,
        concurrency: 5,
        maxRetries: 2,
      },
    });

    expect(result.success).toBe(true);
  });

  it('should reject concurrency over 10', () => {
    const result = createBatchSchema.safeParse({
      items: [{ content: 'Claim 1' }],
      methods: { reasoning: 1.0 },
      options: { concurrency: 20 },
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid webhookUrl', () => {
    const result = createBatchSchema.safeParse({
      items: [{ content: 'Claim 1' }],
      methods: { reasoning: 1.0 },
      webhookUrl: 'not-a-url',
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// createWebhookSchema TESTS
// =============================================================================

describe('createWebhookSchema', () => {
  it('should accept valid webhook request', () => {
    const result = createWebhookSchema.safeParse({
      url: 'https://example.com/webhook',
      events: ['verification.completed'],
    });

    expect(result.success).toBe(true);
  });

  it('should accept multiple events', () => {
    const result = createWebhookSchema.safeParse({
      url: 'https://example.com/webhook',
      events: [
        'verification.completed',
        'verification.failed',
        'batch.completed',
      ],
    });

    expect(result.success).toBe(true);
  });

  it('should accept all valid event types', () => {
    const result = createWebhookSchema.safeParse({
      url: 'https://example.com/webhook',
      events: [
        'verification.completed',
        'verification.failed',
        'verification.escalated',
        'batch.completed',
        'batch.failed',
        'escalation.resolved',
      ],
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid URL', () => {
    const result = createWebhookSchema.safeParse({
      url: 'not-a-url',
      events: ['verification.completed'],
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid event type', () => {
    const result = createWebhookSchema.safeParse({
      url: 'https://example.com/webhook',
      events: ['invalid.event'],
    });

    expect(result.success).toBe(false);
  });

  it('should accept secret when provided', () => {
    const result = createWebhookSchema.safeParse({
      url: 'https://example.com/webhook',
      events: ['verification.completed'],
      secret: 'my-super-secret-key-123',
    });

    expect(result.success).toBe(true);
  });

  it('should reject secret shorter than 16 characters', () => {
    const result = createWebhookSchema.safeParse({
      url: 'https://example.com/webhook',
      events: ['verification.completed'],
      secret: 'short',
    });

    expect(result.success).toBe(false);
  });

  it('should reject secret longer than 128 characters', () => {
    const result = createWebhookSchema.safeParse({
      url: 'https://example.com/webhook',
      events: ['verification.completed'],
      secret: 's'.repeat(129),
    });

    expect(result.success).toBe(false);
  });

  it('should accept secret at min length', () => {
    const result = createWebhookSchema.safeParse({
      url: 'https://example.com/webhook',
      events: ['verification.completed'],
      secret: 's'.repeat(16),
    });

    expect(result.success).toBe(true);
  });

  it('should accept secret at max length', () => {
    const result = createWebhookSchema.safeParse({
      url: 'https://example.com/webhook',
      events: ['verification.completed'],
      secret: 's'.repeat(128),
    });

    expect(result.success).toBe(true);
  });
});
