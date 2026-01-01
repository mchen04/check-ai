/**
 * API Error Classes
 * Standardized error handling for the verification API
 */

import { NextResponse } from 'next/server';
import { ApiErrorResponse } from './types';

// =============================================================================
// BASE API ERROR
// =============================================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toResponse(requestId?: string): Response {
    const body: ApiErrorResponse = {
      error: this.message,
      code: this.code,
      details: this.details,
      requestId,
    };
    return NextResponse.json(body, { status: this.statusCode });
  }
}

// =============================================================================
// SPECIFIC ERROR TYPES
// =============================================================================

export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfterSeconds: number) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT', {
      retryAfter: retryAfterSeconds,
    });
    this.name = 'RateLimitError';
  }
}

export class QuotaExceededError extends ApiError {
  constructor(message: string = 'Monthly verification limit exceeded') {
    super(message, 402, 'QUOTA_EXCEEDED');
    this.name = 'QuotaExceededError';
  }
}

export class MethodNotAllowedError extends ApiError {
  constructor(method: string, allowedMethods: string[]) {
    super(`Method ${method} not allowed`, 405, 'METHOD_NOT_ALLOWED', {
      allowedMethods,
    });
    this.name = 'MethodNotAllowedError';
  }
}

export class PayloadTooLargeError extends ApiError {
  constructor(maxSize: number) {
    super('Request payload too large', 413, 'PAYLOAD_TOO_LARGE', {
      maxSizeBytes: maxSize,
    });
    this.name = 'PayloadTooLargeError';
  }
}

export class UnprocessableEntityError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 422, 'UNPROCESSABLE_ENTITY', details);
    this.name = 'UnprocessableEntityError';
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
    this.name = 'InternalServerError';
  }
}

// =============================================================================
// ERROR FACTORY
// =============================================================================

export function createErrorResponse(error: unknown, requestId?: string): Response {
  // Known API errors
  if (error instanceof ApiError) {
    return error.toResponse(requestId);
  }

  // Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
    const details = {
      errors: zodError.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
    return new ValidationError('Validation failed', details).toResponse(requestId);
  }

  // Log unexpected errors
  console.error('Unexpected API error:', error);

  // Return generic error for unknown errors
  return new InternalServerError().toResponse(requestId);
}
