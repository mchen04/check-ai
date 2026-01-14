/**
 * API Mappers
 * Unified mapping utilities for converting between service layer and API layer types
 *
 * This centralizes:
 * - Service error to API error conversion
 * - Internal types to API response types serialization
 */

import {
  ApiError,
  ValidationError,
  QuotaExceededError,
  NotFoundError,
  ConflictError,
  ServiceUnavailableError,
  InternalServerError,
} from './errors';
import type { VerifyServiceError } from '@/lib/verification/service';
import type { ParadigmResult as InternalParadigmResult } from '@/lib/verification/types';
import type { ParadigmResult as ApiParadigmResult, VerifyResponse } from './types';

// =============================================================================
// SERVICE ERROR TYPES
// =============================================================================

/**
 * Service error types that can be mapped to API errors
 */
export type ServiceErrorType =
  | 'quota_exceeded'
  | 'methods_not_allowed'
  | 'no_api_keys'
  | 'verification_failed'
  | 'not_found'
  | 'conflict'
  | 'validation_error'
  | 'service_unavailable'
  | 'internal_error';

/**
 * Generic service error interface for mapping
 */
export interface ServiceError {
  type: ServiceErrorType;
  message: string;
  details?: unknown;
}

// =============================================================================
// ERROR MAPPING
// =============================================================================

/**
 * API error codes for programmatic error handling
 */
export const API_ERROR_CODES = {
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  METHODS_NOT_ALLOWED: 'METHODS_NOT_ALLOWED',
  NO_API_KEYS: 'NO_API_KEYS',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/**
 * Map a service error to an API error
 * Centralizes the error conversion logic that was previously duplicated in route handlers
 */
export function mapServiceErrorToApiError(error: ServiceError): ApiError {
  switch (error.type) {
    case 'quota_exceeded':
      return new QuotaExceededError(error.message);

    case 'methods_not_allowed':
      // Methods not allowed is a quota-type error (plan limitation)
      return new QuotaExceededError(error.message);

    case 'no_api_keys':
      return new ApiError(error.message, 400, API_ERROR_CODES.NO_API_KEYS, {
        details: error.details,
      });

    case 'verification_failed':
      return new ApiError(error.message, 500, API_ERROR_CODES.VERIFICATION_FAILED, {
        details: error.details,
      });

    case 'not_found':
      return new NotFoundError(error.message);

    case 'conflict':
      return new ConflictError(error.message);

    case 'validation_error':
      return new ValidationError(error.message, error.details as Record<string, unknown>);

    case 'service_unavailable':
      return new ServiceUnavailableError(error.message);

    case 'internal_error':
    default:
      return new InternalServerError(error.message || 'An unexpected error occurred');
  }
}

/**
 * Map a VerifyServiceError specifically (common case)
 */
export function mapVerifyServiceError(error: VerifyServiceError): ApiError {
  return mapServiceErrorToApiError({
    type: error.type,
    message: error.message,
    details: error.details,
  });
}

/**
 * Throw an API error from a service error
 * Convenience function for route handlers
 */
export function throwApiError(error: ServiceError): never {
  throw mapServiceErrorToApiError(error);
}

/**
 * Throw an API error from a VerifyServiceError
 */
export function throwVerifyApiError(error: VerifyServiceError): never {
  throw mapVerifyServiceError(error);
}

// =============================================================================
// TYPE MAPPERS (Internal -> API)
// =============================================================================

/**
 * Map internal ParadigmResult to API ParadigmResult
 * Serializes LLMProvider enum to string and removes internal fields
 */
export function mapParadigmResultToApi(result: InternalParadigmResult): ApiParadigmResult {
  return {
    paradigm: result.paradigm,
    weight: result.weight,
    provider: result.provider, // LLMProvider is already a string union type
    model: result.model,
    verdict: result.verdict,
    confidence: result.confidence,
    reasoning: result.reasoning,
    processingTimeMs: result.processingTimeMs,
    costCents: result.costCents,
    error: result.error,
    // Note: tokenUsage is intentionally excluded from API response
  };
}

/**
 * Map multiple internal ParadigmResults to API format
 */
export function mapParadigmResultsToApi(results: InternalParadigmResult[]): ApiParadigmResult[] {
  return results.map(mapParadigmResultToApi);
}

/**
 * Options for mapping verification results to API response
 */
export interface VerificationMapOptions {
  /** Truncate reasoning to this length (default: 500) */
  maxReasoningLength?: number;
  /** Include paradigm results in response */
  includeParadigmResults?: boolean;
}

/**
 * Map internal verification result to API response format
 */
export function mapVerificationToApiResponse(
  verification: {
    id: string;
    content: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'escalated';
    verdict: 'true' | 'false' | 'uncertain' | null;
    confidence: number | null;
    decision: 'accept' | 'refine' | 'escalate' | 'reject' | null;
    reasoning: string | null;
    paradigmResults?: InternalParadigmResult[];
    processingTimeMs: number | null;
    costCents: number | null;
    cached?: boolean;
    createdAt: Date | string;
    completedAt?: Date | string | null;
  },
  options: VerificationMapOptions = {}
): VerifyResponse {
  const { maxReasoningLength = 500, includeParadigmResults = true } = options;

  const response: VerifyResponse = {
    id: verification.id,
    status: verification.status,
    content: verification.content,
    createdAt:
      verification.createdAt instanceof Date
        ? verification.createdAt.toISOString()
        : verification.createdAt,
  };

  // Only include optional fields if they have values
  if (verification.verdict !== null) {
    response.verdict = verification.verdict;
  }

  if (verification.confidence !== null) {
    response.confidence = verification.confidence;
  }

  if (verification.decision !== null) {
    response.decision = verification.decision;
  }

  if (verification.reasoning !== null) {
    response.reasoning =
      maxReasoningLength > 0
        ? verification.reasoning.slice(0, maxReasoningLength)
        : verification.reasoning;
  }

  if (includeParadigmResults && verification.paradigmResults) {
    response.paradigmResults = mapParadigmResultsToApi(verification.paradigmResults);
  }

  if (verification.processingTimeMs !== null) {
    response.processingTimeMs = verification.processingTimeMs;
  }

  if (verification.costCents !== null) {
    response.costCents = verification.costCents;
  }

  if (verification.cached !== undefined) {
    response.cached = verification.cached;
  }

  if (verification.completedAt) {
    response.completedAt =
      verification.completedAt instanceof Date
        ? verification.completedAt.toISOString()
        : verification.completedAt;
  }

  return response;
}

// =============================================================================
// BATCH ERROR MAPPERS
// =============================================================================

/**
 * Batch error types
 */
