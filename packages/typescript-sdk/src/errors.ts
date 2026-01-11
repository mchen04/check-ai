/**
 * Check SDK Errors
 * Custom error classes for the Check API
 */

import type { ApiErrorResponse } from './types';

/**
 * Base error class for all Check errors
 */
export class CheckError extends Error {
  /** Error code for programmatic handling */
  readonly code: string;
  /** HTTP status code if applicable */
  readonly status?: number;
  /** Request ID for debugging */
  readonly requestId?: string;
  /** Additional error details */
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    options?: {
      code?: string;
      status?: number;
      requestId?: string;
      details?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = 'CheckError';
    this.code = options?.code ?? 'UNKNOWN_ERROR';
    this.status = options?.status;
    this.requestId = options?.requestId;
    this.details = options?.details;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CheckError);
    }
  }

  /**
   * Create error from API response
   */
  static fromResponse(
    response: ApiErrorResponse,
    status: number
  ): CheckError {
    const ErrorClass = getErrorClass(response.code, status);
    return new ErrorClass(response.error, {
      code: response.code,
      status,
      requestId: response.requestId,
      details: response.details,
    });
  }
}

/**
 * Authentication error (401)
 * Thrown when API key is missing, invalid, or expired
 */
export class AuthenticationError extends CheckError {
  constructor(
    message: string,
    options?: {
      code?: string;
      status?: number;
      requestId?: string;
      details?: Record<string, unknown>;
    }
  ) {
    super(message, { ...options, code: options?.code ?? 'AUTHENTICATION_ERROR' });
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (403)
 * Thrown when API key lacks permission for the requested operation
 */
export class AuthorizationError extends CheckError {
  constructor(
    message: string,
    options?: {
      code?: string;
      status?: number;
      requestId?: string;
      details?: Record<string, unknown>;
    }
  ) {
    super(message, { ...options, code: options?.code ?? 'AUTHORIZATION_ERROR' });
    this.name = 'AuthorizationError';
  }
}

/**
 * Validation error (400)
 * Thrown when request parameters are invalid
 */
export class ValidationError extends CheckError {
  constructor(
    message: string,
    options?: {
      code?: string;
      status?: number;
      requestId?: string;
      details?: Record<string, unknown>;
    }
  ) {
    super(message, { ...options, code: options?.code ?? 'VALIDATION_ERROR' });
    this.name = 'ValidationError';
  }
}

/**
 * Not found error (404)
 * Thrown when requested resource doesn't exist
 */
export class NotFoundError extends CheckError {
  constructor(
    message: string,
    options?: {
      code?: string;
      status?: number;
      requestId?: string;
      details?: Record<string, unknown>;
    }
  ) {
    super(message, { ...options, code: options?.code ?? 'NOT_FOUND' });
    this.name = 'NotFoundError';
  }
}

/**
 * Rate limit error (429)
 * Thrown when rate limit is exceeded
 */
export class RateLimitError extends CheckError {
  /** Seconds until rate limit resets */
  readonly retryAfter?: number;

  constructor(
    message: string,
    options?: {
      code?: string;
      status?: number;
      requestId?: string;
      details?: Record<string, unknown>;
      retryAfter?: number;
    }
  ) {
    super(message, { ...options, code: options?.code ?? 'RATE_LIMIT' });
    this.name = 'RateLimitError';
    this.retryAfter = options?.retryAfter;
  }
}

/**
 * Quota exceeded error (402)
 * Thrown when monthly verification quota is exceeded
 */
export class QuotaExceededError extends CheckError {
  constructor(
    message: string,
    options?: {
      code?: string;
      status?: number;
      requestId?: string;
      details?: Record<string, unknown>;
    }
  ) {
    super(message, { ...options, code: options?.code ?? 'QUOTA_EXCEEDED' });
    this.name = 'QuotaExceededError';
  }
}

/**
 * Timeout error
 * Thrown when request or polling times out
 */
export class TimeoutError extends CheckError {
  constructor(
    message: string,
    options?: {
      code?: string;
      status?: number;
      requestId?: string;
      details?: Record<string, unknown>;
    }
  ) {
    super(message, { ...options, code: options?.code ?? 'TIMEOUT' });
    this.name = 'TimeoutError';
  }
}

/**
 * Server error (5xx)
 * Thrown when the API experiences an internal error
 */
export class ServerError extends CheckError {
  constructor(
    message: string,
    options?: {
      code?: string;
      status?: number;
      requestId?: string;
      details?: Record<string, unknown>;
    }
  ) {
    super(message, { ...options, code: options?.code ?? 'SERVER_ERROR' });
    this.name = 'ServerError';
  }
}

/**
 * Get the appropriate error class based on error code or status
 */
function getErrorClass(
  code?: string,
  status?: number
): typeof CheckError {
  // Check by code first
  switch (code) {
    case 'AUTHENTICATION_ERROR':
      return AuthenticationError;
    case 'AUTHORIZATION_ERROR':
      return AuthorizationError;
    case 'VALIDATION_ERROR':
      return ValidationError;
    case 'NOT_FOUND':
      return NotFoundError;
    case 'RATE_LIMIT':
      return RateLimitError;
    case 'QUOTA_EXCEEDED':
      return QuotaExceededError;
    case 'TIMEOUT':
      return TimeoutError;
  }

  // Fall back to status code
  switch (status) {
    case 400:
      return ValidationError;
    case 401:
      return AuthenticationError;
    case 402:
      return QuotaExceededError;
    case 403:
      return AuthorizationError;
    case 404:
      return NotFoundError;
    case 429:
      return RateLimitError;
    case 500:
    case 502:
    case 503:
    case 504:
      return ServerError;
    default:
      return CheckError;
  }
}
