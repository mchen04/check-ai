/**
 * API Types
 * Shared types for API requests, responses, and validation
 *
 * Note: Core verification types are defined in @/lib/verification/types
 * This file re-exports relevant types and defines API-specific variants.
 */

import { z } from 'zod';
import { NextRequest } from 'next/server';
import {
  MethodsConfig,
  methodsConfigSchema,
  Verdict,
  Decision,
  ParadigmResult as VerificationParadigmResult,
} from '@/lib/verification/types';

// Re-export verification types for convenience
export { methodsConfigSchema };
export type { MethodsConfig, Verdict, Decision };

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
    })
    .optional(),
  idempotencyKey: z.string().max(255).optional(),
});

export type VerifyRequest = z.infer<typeof verifyRequestSchema>;

/**
 * API-specific ParadigmResult that serializes provider to string.
 * The internal VerificationParadigmResult uses LLMProvider enum,
 * but API responses use string for JSON serialization.
 */
export interface ParadigmResult extends Omit<VerificationParadigmResult, 'provider' | 'tokenUsage'> {
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
