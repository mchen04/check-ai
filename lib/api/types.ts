/**
 * API Types
 * Shared types for API requests, responses, and validation
 */

import { z } from 'zod';
import { NextRequest } from 'next/server';

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
  };
  apiKeyId: string;
}

// =============================================================================
// VERIFICATION REQUEST/RESPONSE SCHEMAS
// =============================================================================

export const methodsConfigSchema = z
  .object({
    semantic: z.number().min(0).max(1).optional(),
    reasoning: z.number().min(0).max(1).optional(),
    tool: z.number().min(0).max(1).optional(),
    biprm: z.number().min(0).max(1).optional(),
    ensemble: z.number().min(0).max(1).optional(),
    entropy: z.number().min(0).max(1).optional(),
    formal: z.number().min(0).max(1).optional(),
  })
  .refine(
    (data) => {
      const weights = Object.values(data).filter((v) => v !== undefined);
      return weights.length > 0;
    },
    { message: 'At least one verification method must be specified' }
  );

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

export interface ParadigmResult {
  paradigm: string;
  weight: number;
  provider: string;
  model: string;
  verdict: 'true' | 'false' | 'uncertain' | null;
  confidence: number;
  reasoning: string | null;
  processingTimeMs: number;
  costCents: number;
  error?: string;
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
