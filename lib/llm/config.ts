/**
 * LLM Provider Configuration
 * Centralized configuration for all LLM providers
 *
 * This is the single source of truth for:
 * - Default models per provider (7 enterprise-priority providers)
 * - Provider base URLs
 * - Model pricing
 * - Provider tiers
 */

import { LLMProvider } from './types';

// =============================================================================
// PROVIDER TIERS
// =============================================================================

/**
 * Provider classification by tier:
 * - Tier 1: First-party providers (direct APIs)
 * - Tier 2: Cloud providers (enterprise - Azure, Bedrock)
 * - Tier 4: Unified gateways (meta-providers)
 */
export const PROVIDER_TIERS: Record<LLMProvider, 1 | 2 | 4> = {
  // Tier 1: First-party
  openai: 1,
  anthropic: 1,
  google: 1,
  mistral: 1,
  // Tier 2: Cloud
  azure: 2,
  bedrock: 2,
  // Tier 4: Gateways
  openrouter: 4,
};

/**
 * Get all providers for a specific tier
 */
export function getProvidersByTier(tier: number): LLMProvider[] {
  return (Object.entries(PROVIDER_TIERS) as [LLMProvider, number][])
    .filter(([, t]) => t === tier)
    .map(([p]) => p);
}

/**
 * Get all available provider names
 */
export const ALL_PROVIDERS: LLMProvider[] = Object.keys(PROVIDER_TIERS) as LLMProvider[];

// =============================================================================
// DEFAULT MODELS PER PROVIDER
// =============================================================================

export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  // Tier 1: First-party providers
  openai: 'gpt-5.2',
  anthropic: 'claude-sonnet-4-5-20250929',
  google: 'gemini-2.5-flash',
  mistral: 'mistral-large-latest',
  // Tier 2: Cloud providers
  azure: 'gpt-4.1', // Deployment name varies by customer
  bedrock: 'anthropic.claude-sonnet-4-5-20250929-v1:0',
  // Tier 4: Unified gateways
  openrouter: 'anthropic/claude-sonnet-4.5',
};

// =============================================================================
// PROVIDER BASE URLS
// =============================================================================

/**
 * Base URLs for OpenAI-compatible providers
 * Azure and Bedrock use different authentication patterns
 */
export const PROVIDER_BASE_URLS: Partial<Record<LLMProvider, string>> = {
  openai: 'https://api.openai.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  mistral: 'https://api.mistral.ai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};

// =============================================================================
// MODEL PRICING (cost per 1M tokens in USD)
// =============================================================================

export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // ==========================================================================
  // OpenAI (Latest as of Jan 2026)
  // ==========================================================================
  // GPT-5.x Series
  'gpt-5.2': { inputPer1M: 1.75, outputPer1M: 14.0 },
  'gpt-5.1': { inputPer1M: 1.25, outputPer1M: 10.0 },
  'gpt-5': { inputPer1M: 1.25, outputPer1M: 10.0 },
  'gpt-5-mini': { inputPer1M: 0.25, outputPer1M: 2.0 },
  'gpt-5-nano': { inputPer1M: 0.05, outputPer1M: 0.4 },
  // OpenAI Embedding Models
  'text-embedding-3-small': { inputPer1M: 0.02, outputPer1M: 0 },
  'text-embedding-3-large': { inputPer1M: 0.13, outputPer1M: 0 },
  'text-embedding-ada-002': { inputPer1M: 0.1, outputPer1M: 0 },
  // GPT-4.1 Series (April 2025)
  'gpt-4.1': { inputPer1M: 2.0, outputPer1M: 8.0 },
  'gpt-4.1-mini': { inputPer1M: 0.4, outputPer1M: 1.6 },
  'gpt-4.1-nano': { inputPer1M: 0.1, outputPer1M: 0.4 },
  // O-Series Reasoning Models
  o3: { inputPer1M: 2.0, outputPer1M: 8.0 },
  'o3-mini': { inputPer1M: 1.1, outputPer1M: 4.4 },
  'o4-mini': { inputPer1M: 1.1, outputPer1M: 4.4 },
  o1: { inputPer1M: 15.0, outputPer1M: 60.0 },
  // Legacy GPT-4 (still available)
  'gpt-4o': { inputPer1M: 2.5, outputPer1M: 10.0 },
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },
  'gpt-4-turbo': { inputPer1M: 10.0, outputPer1M: 30.0 },

  // ==========================================================================
  // Anthropic (Latest as of Jan 2026)
  // ==========================================================================
  // Claude 4.5 Series (Nov 2025)
  'claude-opus-4-5-20251124': { inputPer1M: 5.0, outputPer1M: 25.0 },
  'claude-sonnet-4-5-20250929': { inputPer1M: 3.0, outputPer1M: 15.0 },
  'claude-haiku-4-5-20251015': { inputPer1M: 1.0, outputPer1M: 5.0 },
  'claude-opus-4-6': { inputPer1M: 5.0, outputPer1M: 25.0 },
  // Claude 4.x Series (May-Aug 2025)
  'claude-opus-4-1-20250805': { inputPer1M: 15.0, outputPer1M: 75.0 },
  'claude-sonnet-4-20250522': { inputPer1M: 3.0, outputPer1M: 15.0 },
  // Legacy Claude 3.5 (still available)
  'claude-3-5-sonnet-20241022': { inputPer1M: 3.0, outputPer1M: 15.0 },
  'claude-3-5-haiku-20241022': { inputPer1M: 0.8, outputPer1M: 4.0 },
  'claude-3-haiku-20240307': { inputPer1M: 0.25, outputPer1M: 1.25 },

  // ==========================================================================
  // Google Gemini (Latest as of Jan 2026)
  // ==========================================================================
  // Gemini 3.x Series (still preview)
  'gemini-3-pro-preview': { inputPer1M: 2.0, outputPer1M: 12.0 },
  'gemini-3-flash-preview': { inputPer1M: 0.1, outputPer1M: 0.4 },
  // Gemini 2.5 Series
  'gemini-2.5-pro': { inputPer1M: 2.5, outputPer1M: 15.0 },
  'gemini-2.5-flash': { inputPer1M: 0.15, outputPer1M: 0.6 },
  'gemini-2.5-flash-lite': { inputPer1M: 0.10, outputPer1M: 0.4 },
  // Legacy
  'gemini-1.5-pro': { inputPer1M: 1.25, outputPer1M: 5.0 },
  'gemini-1.5-flash': { inputPer1M: 0.075, outputPer1M: 0.3 },

  // ==========================================================================
  // Mistral
  // ==========================================================================
  'mistral-large-latest': { inputPer1M: 2.0, outputPer1M: 6.0 },
  'mistral-medium-latest': { inputPer1M: 0.4, outputPer1M: 2.0 },
  'mistral-small-latest': { inputPer1M: 0.05, outputPer1M: 0.08 },
  codestral: { inputPer1M: 0.3, outputPer1M: 0.9 },

  // ==========================================================================
  // OpenRouter (pass-through pricing varies by model)
  // ==========================================================================
  'openai/gpt-5.2': { inputPer1M: 1.75, outputPer1M: 14.0 },
  'openai/gpt-4o': { inputPer1M: 2.5, outputPer1M: 10.0 },
  'openai/gpt-4.1': { inputPer1M: 2.0, outputPer1M: 8.0 },
  'anthropic/claude-opus-4.6': { inputPer1M: 5.0, outputPer1M: 25.0 },
  'anthropic/claude-3.5-sonnet': { inputPer1M: 3.0, outputPer1M: 15.0 },
  'anthropic/claude-sonnet-4.5': { inputPer1M: 3.0, outputPer1M: 15.0 },
  'google/gemini-2.5-flash': { inputPer1M: 0.15, outputPer1M: 0.6 },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate cost in cents for a given model and token usage
 */
export function calculateCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    // Default to gpt-4.1 pricing if model not found
    const defaultPricing = MODEL_PRICING['gpt-4.1'];
    const inputCost = (inputTokens / 1_000_000) * defaultPricing.inputPer1M;
    const outputCost = (outputTokens / 1_000_000) * defaultPricing.outputPer1M;
    return Math.ceil((inputCost + outputCost) * 100);
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return Math.ceil((inputCost + outputCost) * 100); // Convert to cents
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: LLMProvider): string {
  return DEFAULT_MODELS[provider];
}

// =============================================================================
// MODEL SELECTION BY PROVIDER
// =============================================================================

/**
 * Map of provider to their model name patterns/prefixes in MODEL_PRICING
 * Used to filter which models are available for a specific provider credential
 */
const PROVIDER_MODEL_PATTERNS: Record<LLMProvider, RegExp | null> = {
  // Tier 1: First-party providers
  openai: /^(gpt-|o[134]|text-embedding)/,
  anthropic: /^claude-/,
  google: /^(gemini-|text-embedding-004)/,
  mistral: /^(mistral-|codestral)/,  // includes mistral-embed
  // Tier 2: Cloud providers
  azure: /^(gpt-|o[134]|text-embedding)/, // Azure hosts OpenAI models
  bedrock: /^(claude-|anthropic\.)/, // Bedrock hosts Anthropic + others
  // Tier 4: Gateways (null = all models)
  openrouter: null,
};

// =============================================================================
// EMBEDDING MODEL DETECTION
// =============================================================================

/**
 * Patterns that identify embedding models
 */
export const EMBEDDING_MODEL_PATTERNS = [
  /^text-embedding/, // OpenAI & Google embeddings
  /^mistral-embed/, // Mistral embeddings
];

/**
 * Check if a model is an embedding model
 */
export function isEmbeddingModel(model: string): boolean {
  return EMBEDDING_MODEL_PATTERNS.some((pattern) => pattern.test(model));
}

/**
 * Options for filtering models by type
 */
export interface GetModelsOptions {
  /** Only return embedding models */
  embeddingOnly?: boolean;
  /** Exclude embedding models (return only chat/reasoning models) */
  excludeEmbedding?: boolean;
}

/**
 * Get available models for a specific provider
 * OpenRouter can access all models (it's a gateway)
 * Direct providers only return their own models
 *
 * @param provider - The LLM provider
 * @param options - Optional filtering by model type (embedding vs chat)
 */
export function getModelsForProvider(
  provider: LLMProvider,
  options?: GetModelsOptions
): string[] {
  const pattern = PROVIDER_MODEL_PATTERNS[provider];

  let models: string[];
  // OpenRouter (and other gateways) can access all models
  if (pattern === null) {
    models = Object.keys(MODEL_PRICING);
  } else {
    // Filter models by the provider's pattern
    models = Object.keys(MODEL_PRICING).filter((model) => pattern.test(model));
  }

  // Filter by embedding type if requested
  if (options?.embeddingOnly) {
    return models.filter(isEmbeddingModel);
  }
  if (options?.excludeEmbedding) {
    return models.filter((m) => !isEmbeddingModel(m));
  }

  return models;
}

/**
 * Check if a specific model is compatible with a provider
 */
export function isModelCompatibleWithProvider(model: string, provider: LLMProvider): boolean {
  const pattern = PROVIDER_MODEL_PATTERNS[provider];

  // Gateways support all models
  if (pattern === null) {
    return true;
  }

  return pattern.test(model);
}
