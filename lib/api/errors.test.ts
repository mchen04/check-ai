/**
 * Tests for API Error Classes
 * Tests for standardized error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  QuotaExceededError,
  MethodNotAllowedError,
  PayloadTooLargeError,
  UnprocessableEntityError,
  ServiceUnavailableError,
  InternalServerError,
  createErrorResponse,
} from './errors';

// =============================================================================
// ApiError BASE CLASS TESTS
// =============================================================================

describe('ApiError', () => {
  it('should create error with message and status code', () => {
    const error = new ApiError('Test error', 400);

    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ApiError');
  });

  it('should create error with code', () => {
    const error = new ApiError('Test error', 400, 'TEST_CODE');

    expect(error.code).toBe('TEST_CODE');
  });

  it('should create error with details', () => {
    const error = new ApiError('Test error', 400, 'TEST_CODE', { field: 'value' });

    expect(error.details).toEqual({ field: 'value' });
  });

  it('should extend Error', () => {
    const error = new ApiError('Test error', 400);

    expect(error).toBeInstanceOf(Error);
  });

  describe('toResponse', () => {
    it('should create Response with correct status', async () => {
      const error = new ApiError('Test error', 418);
      const response = error.toResponse();

      expect(response.status).toBe(418);
    });

    it('should create Response with JSON body', async () => {
      const error = new ApiError('Test error', 400, 'TEST_CODE', { field: 'value' });
      const response = error.toResponse('req_123');
      const body = await response.json();

      expect(body.error).toBe('Test error');
      expect(body.code).toBe('TEST_CODE');
      expect(body.details).toEqual({ field: 'value' });
      expect(body.requestId).toBe('req_123');
    });

    it('should include requestId when provided', async () => {
      const error = new ApiError('Test error', 400);
      const response = error.toResponse('req_abc123');
      const body = await response.json();

      expect(body.requestId).toBe('req_abc123');
    });

    it('should omit requestId when not provided', async () => {
      const error = new ApiError('Test error', 400);
      const response = error.toResponse();
      const body = await response.json();

      expect(body.requestId).toBeUndefined();
    });
  });
});

// =============================================================================
// ValidationError TESTS
// =============================================================================

describe('ValidationError', () => {
  it('should create error with status 400', () => {
    const error = new ValidationError('Invalid input');

    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.name).toBe('ValidationError');
  });

  it('should include details', () => {
    const error = new ValidationError('Invalid input', {
      errors: [{ field: 'email', message: 'Invalid email format' }],
    });

    expect(error.details).toEqual({
      errors: [{ field: 'email', message: 'Invalid email format' }],
    });
  });

  it('should extend ApiError', () => {
    const error = new ValidationError('Invalid input');

    expect(error).toBeInstanceOf(ApiError);
  });
});

// =============================================================================
// AuthenticationError TESTS
// =============================================================================

describe('AuthenticationError', () => {
  it('should create error with status 401', () => {
    const error = new AuthenticationError();

    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('AUTHENTICATION_ERROR');
    expect(error.name).toBe('AuthenticationError');
  });

  it('should use default message', () => {
    const error = new AuthenticationError();

    expect(error.message).toBe('Authentication required');
  });

  it('should accept custom message', () => {
    const error = new AuthenticationError('Invalid API key');

    expect(error.message).toBe('Invalid API key');
  });
});

// =============================================================================
// AuthorizationError TESTS
// =============================================================================

describe('AuthorizationError', () => {
  it('should create error with status 403', () => {
    const error = new AuthorizationError();

    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('AUTHORIZATION_ERROR');
    expect(error.name).toBe('AuthorizationError');
  });

  it('should use default message', () => {
    const error = new AuthorizationError();

    expect(error.message).toBe('Insufficient permissions');
  });

  it('should accept custom message', () => {
    const error = new AuthorizationError('Admin access required');

    expect(error.message).toBe('Admin access required');
  });
});

// =============================================================================
// NotFoundError TESTS
// =============================================================================

describe('NotFoundError', () => {
  it('should create error with status 404', () => {
    const error = new NotFoundError();

    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.name).toBe('NotFoundError');
  });

  it('should use default resource in message', () => {
    const error = new NotFoundError();

    expect(error.message).toBe('Resource not found');
  });

  it('should include custom resource in message', () => {
    const error = new NotFoundError('Verification');

    expect(error.message).toBe('Verification not found');
  });
});

// =============================================================================
// ConflictError TESTS
// =============================================================================

describe('ConflictError', () => {
  it('should create error with status 409', () => {
    const error = new ConflictError('Resource already exists');

    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
    expect(error.name).toBe('ConflictError');
    expect(error.message).toBe('Resource already exists');
  });
});

// =============================================================================
// RateLimitError TESTS
// =============================================================================

describe('RateLimitError', () => {
  it('should create error with status 429', () => {
    const error = new RateLimitError(60);

    expect(error.statusCode).toBe(429);
    expect(error.code).toBe('RATE_LIMIT');
    expect(error.name).toBe('RateLimitError');
  });

  it('should use standard message', () => {
    const error = new RateLimitError(60);

    expect(error.message).toBe('Rate limit exceeded');
  });

  it('should include retryAfter in details', () => {
    const error = new RateLimitError(30);

    expect(error.details).toEqual({ retryAfter: 30 });
  });
});

// =============================================================================
// QuotaExceededError TESTS
// =============================================================================

describe('QuotaExceededError', () => {
  it('should create error with status 402', () => {
    const error = new QuotaExceededError();

    expect(error.statusCode).toBe(402);
    expect(error.code).toBe('QUOTA_EXCEEDED');
    expect(error.name).toBe('QuotaExceededError');
  });

  it('should use default message', () => {
    const error = new QuotaExceededError();

    expect(error.message).toBe('Monthly verification limit exceeded');
  });

  it('should accept custom message', () => {
    const error = new QuotaExceededError('API call limit reached');

    expect(error.message).toBe('API call limit reached');
  });
});

// =============================================================================
// MethodNotAllowedError TESTS
// =============================================================================

describe('MethodNotAllowedError', () => {
  it('should create error with status 405', () => {
    const error = new MethodNotAllowedError('DELETE', ['GET', 'POST']);

    expect(error.statusCode).toBe(405);
    expect(error.code).toBe('METHOD_NOT_ALLOWED');
    expect(error.name).toBe('MethodNotAllowedError');
  });

  it('should include method in message', () => {
    const error = new MethodNotAllowedError('DELETE', ['GET', 'POST']);

    expect(error.message).toBe('Method DELETE not allowed');
  });

  it('should include allowed methods in details', () => {
    const error = new MethodNotAllowedError('DELETE', ['GET', 'POST']);

    expect(error.details).toEqual({ allowedMethods: ['GET', 'POST'] });
  });
});

// =============================================================================
// PayloadTooLargeError TESTS
// =============================================================================

describe('PayloadTooLargeError', () => {
  it('should create error with status 413', () => {
    const error = new PayloadTooLargeError(1048576);

    expect(error.statusCode).toBe(413);
    expect(error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(error.name).toBe('PayloadTooLargeError');
  });

  it('should use standard message', () => {
    const error = new PayloadTooLargeError(1048576);

    expect(error.message).toBe('Request payload too large');
  });

  it('should include max size in details', () => {
    const error = new PayloadTooLargeError(1048576);

    expect(error.details).toEqual({ maxSizeBytes: 1048576 });
  });
});

// =============================================================================
// UnprocessableEntityError TESTS
// =============================================================================

describe('UnprocessableEntityError', () => {
  it('should create error with status 422', () => {
    const error = new UnprocessableEntityError('Cannot process request');

    expect(error.statusCode).toBe(422);
    expect(error.code).toBe('UNPROCESSABLE_ENTITY');
    expect(error.name).toBe('UnprocessableEntityError');
  });

  it('should include details when provided', () => {
    const error = new UnprocessableEntityError('Invalid configuration', {
      field: 'methods',
      reason: 'At least one method required',
    });

    expect(error.details).toEqual({
      field: 'methods',
      reason: 'At least one method required',
    });
  });
});

// =============================================================================
// ServiceUnavailableError TESTS
// =============================================================================

describe('ServiceUnavailableError', () => {
  it('should create error with status 503', () => {
    const error = new ServiceUnavailableError();

    expect(error.statusCode).toBe(503);
    expect(error.code).toBe('SERVICE_UNAVAILABLE');
    expect(error.name).toBe('ServiceUnavailableError');
  });

  it('should use default message', () => {
    const error = new ServiceUnavailableError();

    expect(error.message).toBe('Service temporarily unavailable');
  });

  it('should accept custom message', () => {
    const error = new ServiceUnavailableError('Database maintenance in progress');

    expect(error.message).toBe('Database maintenance in progress');
  });
});

// =============================================================================
// InternalServerError TESTS
// =============================================================================

describe('InternalServerError', () => {
  it('should create error with status 500', () => {
    const error = new InternalServerError();

    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.name).toBe('InternalServerError');
  });

  it('should use default message', () => {
    const error = new InternalServerError();

    expect(error.message).toBe('Internal server error');
  });

  it('should accept custom message', () => {
    const error = new InternalServerError('Unexpected error occurred');

    expect(error.message).toBe('Unexpected error occurred');
  });
});

// =============================================================================
// createErrorResponse TESTS
// =============================================================================

describe('createErrorResponse', () => {
  it('should handle ApiError instances', async () => {
    const error = new ValidationError('Invalid request');
    const response = createErrorResponse(error, 'req_123');
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid request');
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.requestId).toBe('req_123');
  });

  it('should handle Zod-like validation errors', async () => {
    const zodError = {
      issues: [
        { path: ['content'], message: 'Required' },
        { path: ['methods', 'reasoning'], message: 'Must be between 0 and 1' },
      ],
    };

    const response = createErrorResponse(zodError, 'req_456');
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Validation failed');
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details.errors).toHaveLength(2);
    expect(body.details.errors[0]).toEqual({ path: 'content', message: 'Required' });
    expect(body.details.errors[1]).toEqual({
      path: 'methods.reasoning',
      message: 'Must be between 0 and 1',
    });
  });

  it('should handle unknown errors as InternalServerError', async () => {
    const error = new Error('Unexpected error');
    const response = createErrorResponse(error, 'req_789');
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error');
    expect(body.code).toBe('INTERNAL_ERROR');
  });

  it('should handle string errors', async () => {
    const response = createErrorResponse('Something went wrong', 'req_abc');
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });

  it('should handle null errors', async () => {
    const response = createErrorResponse(null, 'req_def');
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });

  it('should handle undefined errors', async () => {
    const response = createErrorResponse(undefined, 'req_ghi');
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });

  it('should work without requestId', async () => {
    const error = new NotFoundError('Resource');
    const response = createErrorResponse(error);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.requestId).toBeUndefined();
  });
});
