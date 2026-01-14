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
import { NextRequest } from 'next/server';
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
  providerCredentialId: string | null;
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
// API KEY SCHEMAS
// =============================================================================

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  provider: z.enum([
    'platform',
    'openai',
    'anthropic',
    'google',
    'deepseek',
    'groq',
    'together',
    'mistral',
    'cohere',
  ]),
  apiKey: z.string().min(1).optional(), // Required for BYOK providers
  expiresAt: z.string().datetime().optional(),
});

export type CreateApiKeyRequest = z.infer<typeof createApiKeySchema>;

export interface ApiKeyResponse {
  id: string;
  name: string;
  provider: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  // Only included on creation for platform keys
  apiKey?: string;
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
// PAGINATION
// =============================================================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

// =============================================================================
// HANDLER TYPES
// =============================================================================

export type ApiHandler<TParams = Record<string, string>> = (
  req: AuthenticatedRequest,
  context?: { params: Promise<TParams> }
) => Promise<Response>;

export type PublicApiHandler<TParams = Record<string, string>> = (
  req: NextRequest,
  context?: { params: Promise<TParams> }
) => Promise<Response>;

// Alias for backwards compatibility
export type ApiRequest = AuthenticatedRequest;

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

/**
 * Batch with items response
 */
export interface BatchWithItemsResponse extends BatchResponse {
  items: BatchItemResponse[];
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
