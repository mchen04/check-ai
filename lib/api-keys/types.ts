/**
 * API Key Configuration Types
 *
 * Types for the new API key configuration system where each key
 * has its own complete verification configuration.
 */

import { z } from 'zod';
import { LLMProvider } from '@/lib/llm';

// =============================================================================
// PROVIDER CREDENTIAL TYPES
// =============================================================================

/**
 * Supported LLM providers for credentials
 */
export const providerEnum = z.enum([
  // Tier 1: First-party providers
  'openai',
  'anthropic',
  'google',
  'xai',
  'mistral',
  'cohere',
  'deepseek',
  // Tier 2: Cloud providers (enterprise)
  'azure',
  'bedrock',
  // Tier 3: Inference providers
  'groq',
  'together',
  'fireworks',
  'cerebras',
  'perplexity',
  // Tier 4: Unified gateways (recommended)
  'openrouter',
]);

export type CredentialProvider = z.infer<typeof providerEnum>;

/**
 * Provider-specific configuration (for Azure, Bedrock, etc.)
 */
export interface ProviderConfig {
  // Azure OpenAI
  endpoint?: string;
  deploymentId?: string;
  apiVersion?: string;

  // AWS Bedrock
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;

  // Google Vertex AI
  projectId?: string;
  location?: string;
}

/**
 * Provider credential stored in vault
 */
export interface ProviderCredential {
  id: string;
  orgId: string;
  name: string;
  provider: CredentialProvider;
  config?: ProviderConfig;
  isActive: boolean;
  validationStatus: 'valid' | 'invalid' | 'pending';
  lastValidatedAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// PARADIGM CONFIGURATION TYPES
// =============================================================================

/**
 * Base configuration for a single paradigm
 */
export interface ParadigmConfig {
  enabled: boolean;
  weight: number; // 0-1
  model: string; // e.g., "anthropic/claude-3.5-sonnet"
}

/**
 * Ensemble paradigm requires multiple models
 */
export interface EnsembleConfig {
  enabled: boolean;
  weight: number;
  models: string[]; // Multiple models for voting
}

/**
 * Full paradigm configuration for an API key
 */
export interface ApiKeyParadigmConfig {
  reasoning?: ParadigmConfig;
  tool?: ParadigmConfig;
  semantic?: ParadigmConfig;
  ensemble?: EnsembleConfig;
  biprm?: ParadigmConfig;
  entropy?: ParadigmConfig;
  formal?: ParadigmConfig;
}

/**
 * Default thresholds for an API key
 */
export interface ApiKeyThresholds {
  acceptThreshold?: number; // Default: 0.95
  escalateThreshold?: number; // Default: 0.5
  timeout?: number; // Default: 30000ms
}

// =============================================================================
// API KEY CREDENTIAL (Junction table type)
// =============================================================================

/**
 * API key to provider credential link
 */
export interface ApiKeyCredential {
  id: string;
  apiKeyId: string;
  providerCredentialId: string;
  isDefault: boolean;
  createdAt: Date;
  // Joined data
  credential?: ProviderCredential;
}

// =============================================================================
// API KEY TYPES
// =============================================================================

/**
 * Full API key with configuration
 */
export interface ApiKeyWithConfig {
  id: string;
  orgId: string;
  name: string;
  keyPrefix: string;
  paradigmConfig: ApiKeyParadigmConfig | null;
  defaultThresholds: ApiKeyThresholds | null;
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Joined data
  providerCredential?: ProviderCredential; // Default credential (from junction table)
  credentials?: ApiKeyCredential[]; // All credentials via junction table
}

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Create provider credential request
 */
export const createProviderCredentialSchema = z.object({
  name: z.string().min(1).max(100),
  provider: providerEnum,
  apiKey: z.string().min(1), // Will be encrypted before storage
  config: z
    .object({
      endpoint: z.url().optional(),
      deploymentId: z.string().optional(),
      apiVersion: z.string().optional(),
      region: z.string().optional(),
      projectId: z.string().optional(),
      location: z.string().optional(),
    })
    .optional(),
});

export type CreateProviderCredentialRequest = z.infer<typeof createProviderCredentialSchema>;

/**
 * Update provider credential request (all fields optional for partial updates)
 */
export const updateProviderCredentialSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  apiKey: z.string().min(1).optional(), // Will be encrypted before storage
  config: z
    .object({
      endpoint: z.url().optional(),
      deploymentId: z.string().optional(),
      apiVersion: z.string().optional(),
      region: z.string().optional(),
      projectId: z.string().optional(),
      location: z.string().optional(),
    })
    .optional(),
  isActive: z.boolean().optional(),
});

export type UpdateProviderCredentialRequest = z.infer<typeof updateProviderCredentialSchema>;

// =============================================================================
// REUSABLE SCHEMA COMPONENTS
// =============================================================================

/**
 * Single-model paradigm configuration schema
 * Used for: reasoning, tool, semantic, biprm, entropy, formal
 */
const singleModelParadigmSchema = z.object({
  enabled: z.boolean(),
  weight: z.number().min(0).max(1),
  model: z.string(),
});

/**
 * Multi-model paradigm configuration schema
 * Used for: ensemble
 */
const multiModelParadigmSchema = z.object({
  enabled: z.boolean(),
  weight: z.number().min(0).max(1),
  models: z.array(z.string()),
});

/**
 * Threshold configuration schema
 */
const thresholdsSchema = z.object({
  acceptThreshold: z.number().min(0).max(1).optional(),
  escalateThreshold: z.number().min(0).max(1).optional(),
  timeout: z.number().min(1000).max(300000).optional(),
});

/**
 * Full paradigm configuration schema
 */
const paradigmConfigObjectSchema = z.object({
  reasoning: singleModelParadigmSchema.optional(),
  tool: singleModelParadigmSchema.optional(),
  semantic: singleModelParadigmSchema.optional(),
  ensemble: multiModelParadigmSchema.optional(),
  biprm: singleModelParadigmSchema.optional(),
  entropy: singleModelParadigmSchema.optional(),
  formal: singleModelParadigmSchema.optional(),
});

// =============================================================================
// API KEY REQUEST SCHEMAS
// =============================================================================

/**
 * Create API key request
 * Supports multiple provider credentials for multi-provider paradigm configurations
 */
export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  providerCredentialIds: z
    .array(z.uuid())
    .min(1, 'At least one provider credential is required'),
  defaultCredentialId: z.uuid().optional(),
  paradigmConfig: paradigmConfigObjectSchema,
  defaultThresholds: thresholdsSchema.optional(),
  expiresAt: z.string().datetime().optional(),
});

export type CreateApiKeyRequest = z.infer<typeof createApiKeySchema>;

/**
 * Update API key request (all fields optional for partial updates)
 */
export const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  paradigmConfig: paradigmConfigObjectSchema.optional(),
  defaultThresholds: thresholdsSchema.optional(),
  isActive: z.boolean().optional(),
});

export type UpdateApiKeyRequest = z.infer<typeof updateApiKeySchema>;

// =============================================================================
// VERIFICATION REQUEST (for API key config resolution)
// =============================================================================

/**
 * Verification request structure for config resolution.
 * This is the internal type used by resolveVerificationConfig - not a Zod schema.
 * The actual request validation happens at the API layer using verifyRequestSchema.
 */
export interface VerifyRequest {
  /** Optional method overrides (weight or { weight, model }) */
  methods?: Record<string, number | { weight: number; model?: string }>;
  /** Optional threshold/timeout overrides */
  options?: {
    acceptThreshold?: number;
    escalateThreshold?: number;
    timeout?: number;
    maxRetries?: number;
    minConfidence?: number;
    retryOnLowConfidence?: boolean;
  };
}

// =============================================================================
// RESOLVED CONFIGURATION (after merging key config + request overrides)
// =============================================================================

/**
 * Resolved paradigm for execution
 */
export interface ResolvedParadigm {
  paradigm: string;
  weight: number;
  model: string;
  models?: string[]; // For ensemble
}

/**
 * Decrypted credential ready for use
 */
export interface DecryptedCredential {
  provider: CredentialProvider;
  apiKey: string;
  config?: ProviderConfig;
  isDefault: boolean;
}

/**
 * Fully resolved configuration for verification
 */
export interface ResolvedVerificationConfig {
  // All available credentials (keyed by provider)
  credentials: Map<string, DecryptedCredential>;

  // Default credential for fallback
  defaultCredential: DecryptedCredential;

  // Paradigms to run
  paradigms: ResolvedParadigm[];

  // Thresholds
  acceptThreshold: number;
  escalateThreshold: number;
  timeout: number;
  maxRetries: number;
  minConfidence?: number;
  retryOnLowConfidence: boolean;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_THRESHOLDS = {
  acceptThreshold: 0.95,
  escalateThreshold: 0.5,
  timeout: 30000,
  maxRetries: 0,
  retryOnLowConfidence: false,
} as const;

export const DEFAULT_MODELS: Record<string, string> = {
  reasoning: 'anthropic/claude-sonnet-4.5',
  tool: 'openai/gpt-4.1-mini',
  semantic: 'openai/text-embedding-3-small',
  biprm: 'anthropic/claude-sonnet-4.5',
  entropy: 'openai/gpt-4.1-mini',
  formal: 'openai/gpt-4.1',
};

export const DEFAULT_ENSEMBLE_MODELS = [
  'anthropic/claude-sonnet-4.5',
  'openai/gpt-4.1',
  'google/gemini-2.5-flash',
];
