/**
 * API Types
 * Shared types for API requests, responses, and validation
 *
 * ARCHITECTURE NOTE:
 * This file defines API-specific types that are serialized to JSON for API responses.
 * Internal types (using enums, Date objects, etc.) are defined in their respective modules:
 * - Verification types: @/lib/verification/types
 * - LLM types: @/lib/llm/types
 *
 * Key differences between internal and API types:
 * - API types use string for dates (ISO 8601)
 * - API types use string for enum-like values (for JSON serialization)
 * - API types exclude internal-only fields (e.g., tokenUsage)
 *
 * Use mappers from @/lib/api/mappers.ts to convert between internal and API types.
 */

import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import {
  MethodsConfig,
  methodsConfigSchema,
  Verdict,
  Decision,
  ParadigmResult as InternalParadigmResult,
} from '@/lib/verification/types';
import type { ApiKeyParadigmConfig, ApiKeyThresholds } from '@/lib/api-keys/types';

// Re-export verification types for convenience
export { methodsConfigSchema };
export type { MethodsConfig, Verdict, Decision };

// Re-export internal type for mapper access
export type { InternalParadigmResult };

// =============================================================================
// API KEY CONFIGURATION
// =============================================================================

export interface ApiKeyConfiguration {
  id: string;
  name: string;
  paradigmConfig: ApiKeyParadigmConfig | null;
  defaultThresholds: ApiKeyThresholds | null;
}

// =============================================================================
// API REQUEST TYPES
// =============================================================================

export interface AuthenticatedRequest extends NextRequest {
  organization: {
    id: string;
    name: string;
    slug: string;
    planType: 'free' | 'pro' | 'enterprise';
    verificationsUsed: number;
    verificationsLimit: number;
    verificationRetentionDays: number;
    dataRetentionEnabled: boolean;
  };
  apiKeyId: string;
  apiKeyConfig?: ApiKeyConfiguration;
}

// =============================================================================
// VERIFICATION REQUEST/RESPONSE SCHEMAS
// =============================================================================

// Note: methodsConfigSchema is imported from @/lib/verification/types

export const verifyRequestSchema = z.object({
  content: z.string().min(1, 'Content is required').max(50000, 'Content too long'),
  context: z.record(z.string(), z.unknown()).optional(),
  methods: methodsConfigSchema,
  options: z
    .object({
      timeout: z.number().min(1000).max(300000).optional(),
      minConfidence: z.number().min(0).max(1).optional(),
      acceptThreshold: z.number().min(0).max(1).optional(),
      escalateThreshold: z.number().min(0).max(1).optional(),
      maxRetries: z.number().int().min(0).max(5).optional(),
      retryOnLowConfidence: z.boolean().optional(),
    })
    .optional(),
  idempotencyKey: z.string().max(255).optional(),
});

export type VerifyRequest = z.infer<typeof verifyRequestSchema>;

/**
 * API-specific ParadigmResult for JSON serialization.
 *
 * Differences from internal ParadigmResult (@/lib/verification/types):
 * - `provider`: string (internal uses LLMProvider union type)
 * - `tokenUsage`: excluded (internal-only for billing)
 *
 * Use `mapParadigmResultToApi()` from @/lib/api/mappers.ts to convert.
 */
export interface ParadigmResult extends Omit<InternalParadigmResult, 'provider' | 'tokenUsage'> {
  /** LLM provider identifier (serialized from LLMProvider type) */
  provider: string;
}

export interface VerifyResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'escalated';
  content: string;
  verdict?: 'true' | 'false' | 'uncertain';
  confidence?: number;
  decision?: 'accept' | 'refine' | 'escalate' | 'reject';
  reasoning?: string;
  paradigmResults?: ParadigmResult[];
  processingTimeMs?: number;
  costCents?: number;
  cached?: boolean;
  createdAt: string;
  completedAt?: string;
}

// =============================================================================
// USAGE SCHEMAS
// =============================================================================

export interface UsageStats {
  period: {
    start: string;
    end: string;
  };
  verifications: {
    total: number;
    limit: number;
    remaining: number;
  };
  byMethod: Record<string, number>;
  byProvider: Record<
    string,
    {
      requests: number;
      inputTokens: number;
      outputTokens: number;
      costCents: number;
    }
  >;
  totalCostCents: number;
}

// =============================================================================
// ERROR RESPONSE
// =============================================================================

export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

// =============================================================================
// HANDLER TYPES
// =============================================================================

// Alias for backwards compatibility
export type ApiRequest = AuthenticatedRequest;

// Import RouteContext from validation to use in handler types
// Note: We don't re-export here to avoid duplicate exports in index.ts
import type { RouteContext } from './validation';

/**
 * Handler function for authenticated API routes
 * Used after withApiAuth middleware has attached organization context
 */
export type ApiHandler = (
  req: AuthenticatedRequest,
  context: RouteContext | undefined
) => Promise<Response>;

/**
 * Handler function for public (unauthenticated) API routes
 * Used for the outer wrapper that performs authentication
 */
export type PublicApiHandler = (
  req: NextRequest,
  context: RouteContext | undefined
) => Promise<Response>;

// =============================================================================
// VERIFICATION STATUS TYPES (API-specific)
// =============================================================================

/**
 * Verification status values for API responses
 */
export type VerificationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'escalated';

/**
 * Verdict values for API responses
 */
export type ApiVerdict = 'true' | 'false' | 'uncertain';

/**
 * Decision values for API responses
 */
export type ApiDecision = 'accept' | 'refine' | 'escalate' | 'reject';

// =============================================================================
// BATCH API TYPES
// =============================================================================

/**
 * Batch status for API responses
 */
export type BatchStatus = 'pending' | 'validating' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * Batch item status for API responses
 */
export type BatchItemStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'skipped';

/**
 * Batch creation request
 */
export const createBatchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  items: z
    .array(
      z.object({
        content: z.string().min(1).max(50000),
        context: z.record(z.string(), z.unknown()).optional(),
        idempotencyKey: z.string().max(255).optional(),
      })
    )
    .min(1)
    .max(100),
  methods: methodsConfigSchema,
  options: z
    .object({
      timeout: z.number().min(1000).max(300000).optional(),
      minConfidence: z.number().min(0).max(1).optional(),
      acceptThreshold: z.number().min(0).max(1).optional(),
      escalateThreshold: z.number().min(0).max(1).optional(),
      maxRetries: z.number().int().min(0).max(5).optional(),
      retryOnLowConfidence: z.boolean().optional(),
      concurrency: z.number().min(1).max(10).optional(),
    })
    .optional(),
  webhookUrl: z.string().url().optional(),
});

export type CreateBatchRequest = z.infer<typeof createBatchSchema>;

/**
 * Batch response for API
 */
export interface BatchResponse {
  id: string;
  name: string | null;
  status: BatchStatus;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  methods: MethodsConfig;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  totalCostCents: number;
  totalProcessingTimeMs: number;
}

/**
 * Batch item response for API
 */
export interface BatchItemResponse {
  id: string;
  itemIndex: number;
  idempotencyKey: string | null;
  content: string;
  context: Record<string, unknown> | null;
  status: BatchItemStatus;
  verificationId: string | null;
  verdict: ApiVerdict | null;
  confidence: number | null;
  decision: ApiDecision | null;
  errorMessage: string | null;
  costCents: number | null;
  processingTimeMs: number | null;
  completedAt: string | null;
}

// =============================================================================
// WEBHOOK API TYPES
// =============================================================================

/**
 * Webhook event types
 */
export type WebhookEventType =
  | 'verification.completed'
  | 'verification.failed'
  | 'verification.escalated'
  | 'batch.completed'
  | 'batch.failed'
  | 'escalation.resolved';

/**
 * Webhook creation request
 */
export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(
    z.enum([
      'verification.completed',
      'verification.failed',
      'verification.escalated',
      'batch.completed',
      'batch.failed',
      'escalation.resolved',
    ])
  ),
  secret: z.string().min(16).max(128).optional(),
});

export type CreateWebhookRequest = z.infer<typeof createWebhookSchema>;

/**
 * Webhook response for API
 */
export interface WebhookResponse {
  id: string;
  url: string;
  events: WebhookEventType[];
  isActive: boolean;
  createdAt: string;
  lastDeliveryAt: string | null;
  lastDeliveryStatus: 'success' | 'failed' | null;
}

// =============================================================================
// ESCALATION API TYPES
// =============================================================================

/**
 * Escalation status for API responses
 */
export type EscalationStatus = 'pending' | 'in_review' | 'resolved' | 'expired';

/**
 * Escalation resolution
 */
export type EscalationResolution = 'approved' | 'rejected' | 'modified';

/**
 * Escalation response for API
 */
export interface EscalationResponse {
  id: string;
  verificationId: string;
  status: EscalationStatus;
  confidence: number;
  reasoning: string | null;
  resolution: EscalationResolution | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

// =============================================================================
// PAGINATION UTILITIES
// =============================================================================

/**
 * Default pagination values
 */
export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
} as const;

/**
 * Parsed pagination parameters from query string
 */
export interface ParsedPagination {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Parse pagination parameters from URL search params
 * Provides consistent pagination handling across all API routes
 *
 * @param searchParams - URLSearchParams from the request
 * @param options - Optional overrides for default values
 * @returns Parsed and validated pagination parameters
 *
 * @example
 * const { searchParams } = new URL(req.url);
 * const { page, limit, offset } = parsePagination(searchParams);
 */
export function parsePagination(
  searchParams: URLSearchParams,
  options?: { defaultLimit?: number; maxLimit?: number }
): ParsedPagination {
  const defaultLimit = options?.defaultLimit ?? PAGINATION_DEFAULTS.limit;
  const maxLimit = options?.maxLimit ?? PAGINATION_DEFAULTS.maxLimit;

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(maxLimit, Math.max(1, parseInt(searchParams.get('limit') || String(defaultLimit), 10)));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Create a standard pagination response object
 *
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Pagination metadata for API response
 */
export function createPaginationResponse(
  page: number,
  limit: number,
  total: number
): {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
} {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Result type for paginateResults helper
 */
export interface PaginatedResult<T> {
  /** The paginated items (limited to requested page size) */
  items: T[];
  /** Pagination metadata */
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * Helper for the "+1 fetch" pagination pattern.
 * Takes results fetched with limit+1 and returns standardized pagination info.
 *
 * Use this when you don't need total count (more efficient than count query).
 * For routes that need total count, use createPaginationResponse() instead.
 *
 * @param results - Array fetched with limit+1
 * @param page - Current page number
 * @param limit - Requested page size
 * @returns Items limited to page size and standardized pagination info
 *
 * @example
 * const results = await db.select().from(table).limit(limit + 1).offset(offset);
 * const { items, pagination } = paginateResults(results, page, limit);
 * return NextResponse.json({ data: items, pagination });
 */
export function paginateResults<T>(
  results: T[],
  page: number,
  limit: number
): PaginatedResult<T> {
  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, limit) : results;
  return {
    items,
    pagination: {
      page,
      limit,
      hasMore,
    },
  };
}

// =============================================================================
// SUCCESS RESPONSE WRAPPERS
// =============================================================================

/**
 * Standard success response wrapper
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  requestId?: string;
}

/**
 * Standard list response with metadata
 */
export interface ApiListResponse<T> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  requestId?: string;
}
