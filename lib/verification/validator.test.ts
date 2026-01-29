/**
 * Tests for Verification Validator
 * Tests for request validation and helper functions
 */

import { describe, it, expect } from 'vitest';
import {
  validateVerifyRequest,
  getRequestedMethods,
  getMethodsCount,
  VerifyRequestSchema,
  MethodsConfigSchema,
  VerifyOptionsSchema,
} from './validator';

// =============================================================================
// VerifyRequestSchema TESTS
// =============================================================================

describe('VerifyRequestSchema', () => {
  describe('content field', () => {
    it('should accept valid content', () => {
      const result = VerifyRequestSchema.safeParse({
        content: 'This is a valid claim to verify.',
      });

      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const result = VerifyRequestSchema.safeParse({
        content: '',
        methods: { reasoning: 1.0 },
      });

      expect(result.success).toBe(false);
    });

    it('should reject content longer than 100000 characters', () => {
      const result = VerifyRequestSchema.safeParse({
        content: 'x'.repeat(100001),
        methods: { reasoning: 1.0 },
      });

      expect(result.success).toBe(false);
    });

    it('should accept content at max length', () => {
      const result = VerifyRequestSchema.safeParse({
        content: 'x'.repeat(100000),
      });

      expect(result.success).toBe(true);
    });
  });

  describe('context field', () => {
    it('should accept valid context object', () => {
      const result = VerifyRequestSchema.safeParse({
        content: 'Test content',
        context: { source: 'user', timestamp: 123456 },
      });

      expect(result.success).toBe(true);
    });

    it('should accept nested context objects', () => {
      const result = VerifyRequestSchema.safeParse({
        content: 'Test content',
        context: {
          metadata: { nested: { deeply: true } },
          array: [1, 2, 3],
        },
      });

      expect(result.success).toBe(true);
    });

    it('should accept empty context object', () => {
      const result = VerifyRequestSchema.safeParse({
        content: 'Test content',
        context: {},
      });

      expect(result.success).toBe(true);
    });

    it('should allow omitting context', () => {
      const result = VerifyRequestSchema.safeParse({
        content: 'Test content',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('idempotencyKey field', () => {
    it('should accept valid idempotency key', () => {
      const result = VerifyRequestSchema.safeParse({
        content: 'Test content',
        idempotencyKey: 'unique-key-123',
      });

      expect(result.success).toBe(true);
    });

    it('should reject idempotency key longer than 255 characters', () => {
      const result = VerifyRequestSchema.safeParse({
        content: 'Test content',
        idempotencyKey: 'k'.repeat(256),
      });

      expect(result.success).toBe(false);
    });

    it('should accept idempotency key at max length', () => {
      const result = VerifyRequestSchema.safeParse({
        content: 'Test content',
        idempotencyKey: 'k'.repeat(255),
      });

      expect(result.success).toBe(true);
    });

    it('should allow omitting idempotency key', () => {
      const result = VerifyRequestSchema.safeParse({
        content: 'Test content',
      });

      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// MethodsConfigSchema TESTS
// =============================================================================

describe('MethodsConfigSchema', () => {
  it('should accept valid methods configuration', () => {
    const result = MethodsConfigSchema.safeParse({
      reasoning: 1.0,
      tool: 0.8,
    });

    expect(result.success).toBe(true);
  });

  it('should accept all paradigm types', () => {
    const result = MethodsConfigSchema.safeParse({
      semantic: 0.5,
      reasoning: 0.7,
      tool: 0.8,
      biprm: 0.6,
      ensemble: 0.9,
      entropy: 0.4,
      formal: 1.0,
    });

    expect(result.success).toBe(true);
  });

  it('should accept weight of 0', () => {
    const result = MethodsConfigSchema.safeParse({
      reasoning: 0,
    });

    expect(result.success).toBe(true);
  });

  it('should accept weight of 1', () => {
    const result = MethodsConfigSchema.safeParse({
      reasoning: 1,
    });

    expect(result.success).toBe(true);
  });

  it('should reject weight greater than 1', () => {
    const result = MethodsConfigSchema.safeParse({
      reasoning: 1.5,
    });

    expect(result.success).toBe(false);
  });

  it('should reject negative weight', () => {
    const result = MethodsConfigSchema.safeParse({
      reasoning: -0.1,
    });

    expect(result.success).toBe(false);
  });

  it('should allow undefined (for API key defaults)', () => {
    const result = MethodsConfigSchema.safeParse(undefined);

    expect(result.success).toBe(true);
  });

  it('should allow empty object', () => {
    const result = MethodsConfigSchema.safeParse({});

    expect(result.success).toBe(true);
  });
});

// =============================================================================
// VerifyOptionsSchema TESTS
// =============================================================================

describe('VerifyOptionsSchema', () => {
  describe('timeout field', () => {
    it('should accept valid timeout', () => {
      const result = VerifyOptionsSchema.safeParse({
        timeout: 30000,
      });

      expect(result.success).toBe(true);
    });

    it('should reject timeout less than 1000ms', () => {
      const result = VerifyOptionsSchema.safeParse({
        timeout: 500,
      });

      expect(result.success).toBe(false);
    });

    it('should reject timeout greater than 300000ms', () => {
      const result = VerifyOptionsSchema.safeParse({
        timeout: 400000,
      });

      expect(result.success).toBe(false);
    });

    it('should accept minimum timeout of 1000ms', () => {
      const result = VerifyOptionsSchema.safeParse({
        timeout: 1000,
      });

      expect(result.success).toBe(true);
    });

    it('should accept maximum timeout of 300000ms', () => {
      const result = VerifyOptionsSchema.safeParse({
        timeout: 300000,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('confidence thresholds', () => {
    it('should accept valid minConfidence', () => {
      const result = VerifyOptionsSchema.safeParse({
        minConfidence: 0.8,
      });

      expect(result.success).toBe(true);
    });

    it('should accept valid acceptThreshold', () => {
      const result = VerifyOptionsSchema.safeParse({
        acceptThreshold: 0.9,
      });

      expect(result.success).toBe(true);
    });

    it('should accept valid escalateThreshold', () => {
      const result = VerifyOptionsSchema.safeParse({
        escalateThreshold: 0.4,
      });

      expect(result.success).toBe(true);
    });

    it('should reject minConfidence less than 0', () => {
      const result = VerifyOptionsSchema.safeParse({
        minConfidence: -0.1,
      });

      expect(result.success).toBe(false);
    });

    it('should reject minConfidence greater than 1', () => {
      const result = VerifyOptionsSchema.safeParse({
        minConfidence: 1.1,
      });

      expect(result.success).toBe(false);
    });

    it('should reject when acceptThreshold <= escalateThreshold', () => {
      const result = VerifyOptionsSchema.safeParse({
        acceptThreshold: 0.5,
        escalateThreshold: 0.5,
      });

      expect(result.success).toBe(false);
    });

    it('should accept when acceptThreshold > escalateThreshold', () => {
      const result = VerifyOptionsSchema.safeParse({
        acceptThreshold: 0.9,
        escalateThreshold: 0.4,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('retry options', () => {
    it('should accept valid maxRetries', () => {
      const result = VerifyOptionsSchema.safeParse({
        maxRetries: 3,
      });

      expect(result.success).toBe(true);
    });

    it('should reject maxRetries less than 0', () => {
      const result = VerifyOptionsSchema.safeParse({
        maxRetries: -1,
      });

      expect(result.success).toBe(false);
    });

    it('should reject maxRetries greater than 5', () => {
      const result = VerifyOptionsSchema.safeParse({
        maxRetries: 6,
      });

      expect(result.success).toBe(false);
    });

    it('should reject non-integer maxRetries', () => {
      const result = VerifyOptionsSchema.safeParse({
        maxRetries: 2.5,
      });

      expect(result.success).toBe(false);
    });

    it('should accept retryOnLowConfidence with minConfidence', () => {
      const result = VerifyOptionsSchema.safeParse({
        retryOnLowConfidence: true,
        minConfidence: 0.8,
      });

      expect(result.success).toBe(true);
    });

    it('should reject retryOnLowConfidence without minConfidence', () => {
      const result = VerifyOptionsSchema.safeParse({
        retryOnLowConfidence: true,
      });

      expect(result.success).toBe(false);
    });

    it('should accept retryOnLowConfidence: false without minConfidence', () => {
      const result = VerifyOptionsSchema.safeParse({
        retryOnLowConfidence: false,
      });

      expect(result.success).toBe(true);
    });
  });

  it('should allow undefined', () => {
    const result = VerifyOptionsSchema.safeParse(undefined);

    expect(result.success).toBe(true);
  });
});

// =============================================================================
// validateVerifyRequest TESTS
// =============================================================================

describe('validateVerifyRequest', () => {
  describe('successful validation', () => {
    it('should return success for valid minimal request', () => {
      const result = validateVerifyRequest({
        content: 'Test claim to verify',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe('Test claim to verify');
      }
    });

    it('should return success for full request', () => {
      const result = validateVerifyRequest({
        content: 'Test claim to verify',
        context: { source: 'test' },
        methods: { reasoning: 1.0, tool: 0.8 },
        options: { timeout: 30000, maxRetries: 2 },
        idempotencyKey: 'unique-123',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe('Test claim to verify');
        expect(result.data.context).toEqual({ source: 'test' });
        expect(result.data.methods).toEqual({ reasoning: 1.0, tool: 0.8 });
        expect(result.data.options?.timeout).toBe(30000);
        expect(result.data.idempotencyKey).toBe('unique-123');
      }
    });
  });

  describe('failed validation', () => {
    it('should return errors for missing content', () => {
      const result = validateVerifyRequest({});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should return field-specific errors', () => {
      const result = validateVerifyRequest({
        content: '',
        methods: { reasoning: 2.0 },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const fields = result.errors.map((e) => e.field);
        expect(fields.some((f) => f.includes('content') || f === '')).toBe(true);
      }
    });

    it('should handle null input', () => {
      const result = validateVerifyRequest(null);

      expect(result.success).toBe(false);
    });

    it('should handle non-object input', () => {
      const result = validateVerifyRequest('string input');

      expect(result.success).toBe(false);
    });

    it('should handle array input', () => {
      const result = validateVerifyRequest([{ content: 'test' }]);

      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// getRequestedMethods TESTS
// =============================================================================

describe('getRequestedMethods', () => {
  it('should return methods with weight > 0', () => {
    const methods = getRequestedMethods({
      reasoning: 1.0,
      tool: 0.8,
      semantic: 0,
    });

    expect(methods).toContain('reasoning');
    expect(methods).toContain('tool');
    expect(methods).not.toContain('semantic');
  });

  it('should return empty array for all zero weights', () => {
    const methods = getRequestedMethods({
      reasoning: 0,
      tool: 0,
    });

    expect(methods).toHaveLength(0);
  });

  it('should return empty array for empty config', () => {
    const methods = getRequestedMethods({});

    expect(methods).toHaveLength(0);
  });

  it('should handle undefined weights', () => {
    const methods = getRequestedMethods({
      reasoning: 1.0,
      tool: undefined,
    });

    expect(methods).toContain('reasoning');
    expect(methods).not.toContain('tool');
  });

  it('should return all methods when all have positive weights', () => {
    const methods = getRequestedMethods({
      semantic: 0.3,
      reasoning: 1.0,
      tool: 0.8,
      biprm: 0.6,
      ensemble: 0.9,
      entropy: 0.4,
      formal: 0.1,
    });

    expect(methods).toHaveLength(7);
  });
});

// =============================================================================
// getMethodsCount TESTS
// =============================================================================

describe('getMethodsCount', () => {
  it('should count methods with weight > 0', () => {
    const count = getMethodsCount({
      reasoning: 1.0,
      tool: 0.8,
      semantic: 0,
    });

    expect(count).toBe(2);
  });

  it('should return 0 for empty config', () => {
    const count = getMethodsCount({});

    expect(count).toBe(0);
  });

  it('should return 0 for all zero weights', () => {
    const count = getMethodsCount({
      reasoning: 0,
      tool: 0,
      semantic: 0,
    });

    expect(count).toBe(0);
  });

  it('should handle undefined weights', () => {
    const count = getMethodsCount({
      reasoning: 1.0,
      tool: undefined,
      semantic: 0.5,
    });

    expect(count).toBe(2);
  });

  it('should count all methods when all have positive weights', () => {
    const count = getMethodsCount({
      semantic: 0.3,
      reasoning: 1.0,
      tool: 0.8,
      biprm: 0.6,
      ensemble: 0.9,
      entropy: 0.4,
      formal: 0.1,
    });

    expect(count).toBe(7);
  });

  it('should not count methods with weight exactly 0', () => {
    const count = getMethodsCount({
      reasoning: 0.001,
      tool: 0,
    });

    expect(count).toBe(1);
  });
});
