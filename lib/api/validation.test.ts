/**
 * Tests for API Validation Helpers
 * Tests for request validation utilities and route parameter extraction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  parseAndValidate,
  validate,
  createValidationErrorResponse,
  errorResponse,
  validateEnumParam,
  extractRouteParam,
  assertOrgOwnership,
  RouteContext,
} from './validation';

// =============================================================================
// parseAndValidate TESTS
// =============================================================================

describe('parseAndValidate', () => {
  const TestSchema = z.object({
    name: z.string().min(1),
    count: z.number().positive(),
  });

  it('should parse valid JSON and validate against schema', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify({ name: 'test', count: 5 }),
    });

    const result = await parseAndValidate(request, TestSchema);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'test', count: 5 });
    }
  });

  it('should return error for invalid JSON', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      body: 'not json',
    });

    const result = await parseAndValidate(request, TestSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      const body = await result.error.json();
      expect(body.error).toBe('Invalid JSON body');
    }
  });

  it('should return validation error for invalid data', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify({ name: '', count: -1 }),
    });

    const result = await parseAndValidate(request, TestSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.status).toBe(400);
    }
  });
});

// =============================================================================
// validate TESTS
// =============================================================================

describe('validate', () => {
  const TestSchema = z.object({
    email: z.string().email(),
  });

  it('should validate correct data', () => {
    const result = validate({ email: 'test@example.com' }, TestSchema);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
    }
  });

  it('should return error for invalid data', () => {
    const result = validate({ email: 'invalid' }, TestSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.status).toBe(400);
    }
  });
});

// =============================================================================
// errorResponse TESTS
// =============================================================================

describe('errorResponse', () => {
  it('should create badRequest response with default message', async () => {
    const response = errorResponse.badRequest();
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Bad request');
  });

  it('should create badRequest response with custom message', async () => {
    const response = errorResponse.badRequest('Invalid input');
    const body = await response.json();

    expect(body.error).toBe('Invalid input');
  });

  it('should create unauthorized response', async () => {
    const response = errorResponse.unauthorized();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('should create forbidden response', async () => {
    const response = errorResponse.forbidden();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('should create notFound response', async () => {
    const response = errorResponse.notFound('User not found');
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('User not found');
  });

  it('should create conflict response', async () => {
    const response = errorResponse.conflict('Already exists');
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe('Already exists');
  });

  it('should create internalError response', async () => {
    const response = errorResponse.internalError();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });
});

// =============================================================================
// validateEnumParam TESTS
// =============================================================================

describe('validateEnumParam', () => {
  const validStatuses = ['pending', 'active', 'completed'] as const;

  it('should return valid enum value', () => {
    const result = validateEnumParam('active', validStatuses);
    expect(result).toBe('active');
  });

  it('should return null for invalid value', () => {
    const result = validateEnumParam('invalid', validStatuses);
    expect(result).toBeNull();
  });

  it('should return null for null input', () => {
    const result = validateEnumParam(null, validStatuses);
    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = validateEnumParam('', validStatuses);
    expect(result).toBeNull();
  });
});

// =============================================================================
// extractRouteParam TESTS
// =============================================================================

describe('extractRouteParam', () => {
  it('should extract id parameter by default', async () => {
    const context: RouteContext = {
      params: Promise.resolve({ id: 'abc123' }),
    };

    const id = await extractRouteParam(context);
    expect(id).toBe('abc123');
  });

  it('should extract named parameter', async () => {
    const context: RouteContext<{ userId: string }> = {
      params: Promise.resolve({ userId: 'user456' }),
    };

    const userId = await extractRouteParam(context, 'userId');
    expect(userId).toBe('user456');
  });

  it('should throw NotFoundError for undefined context', async () => {
    await expect(extractRouteParam(undefined)).rejects.toThrow();
  });

  it('should throw NotFoundError for missing parameter', async () => {
    const context: RouteContext = {
      params: Promise.resolve({ id: '' }),
    };

    await expect(extractRouteParam(context)).rejects.toThrow();
  });
});

// =============================================================================
// assertOrgOwnership TESTS
// =============================================================================

describe('assertOrgOwnership', () => {
  it('should not throw for matching org IDs', async () => {
    await expect(
      assertOrgOwnership('org123', 'org123')
    ).resolves.toBeUndefined();
  });

  it('should throw AuthorizationError for mismatched org IDs', async () => {
    await expect(
      assertOrgOwnership('org123', 'org456')
    ).rejects.toThrow();
  });
});
