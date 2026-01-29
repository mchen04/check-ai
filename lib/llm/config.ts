/**
 * LLM Provider Configuration
 * Centralized configuration for all LLM providers
 *
 * This is the single source of truth for:
 * - Default models per provider
 * - Provider base URLs
 * - Model pricing
 * - LiteLLM prefixes
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
 * - Tier 3: Inference providers (fast/cheap)
 * - Tier 4: Unified gateways (meta-providers)
 */
export const PROVIDER_TIERS: Record<LLMProvider, 1 | 2 | 3 | 4> = {
  // Tier 1: First-party
  openai: 1,
  anthropic: 1,
  google: 1,
  xai: 1,
  mistral: 1,
  cohere: 1,
  deepseek: 1,
  // Tier 2: Cloud
  azure: 2,
  bedrock: 2,
  // Tier 3: Inference
  groq: 3,
  together: 3,
  fireworks: 3,
  cerebras: 3,
  perplexity: 3,
  // Tier 4: Gateways
  openrouter: 4,
  // Legacy
  replicate: 4,
};

/**
 * Get all providers for a specific tier
 */
export function getProvidersByTier(tier: 1 | 2 | 3 | 4): LLMProvider[] {
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
  openai: 'gpt-4.1',
  anthropic: 'claude-sonnet-4-5-20250929',
  google: 'gemini-2.5-flash',
  xai: 'grok-4',
  mistral: 'mistral-large-latest',
  cohere: 'command-r-plus',
  deepseek: 'deepseek-chat',
  // Tier 2: Cloud providers
  azure: 'gpt-4o', // Deployment name varies by customer
  bedrock: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  // Tier 3: Inference providers
  groq: 'llama-3.3-70b-versatile',
  together: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  fireworks: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
  cerebras: 'llama3.3-70b',
  perplexity: 'sonar',
  // Tier 4: Unified gateways
  openrouter: 'anthropic/claude-3.5-sonnet',
  // Legacy
  replicate: 'meta/llama-2-70b-chat',
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
  xai: 'https://api.x.ai/v1',
  mistral: 'https://api.mistral.ai/v1',
  deepseek: 'https://api.deepseek.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  together: 'https://api.together.xyz/v1',
  fireworks: 'https://api.fireworks.ai/inference/v1',
  cerebras: 'https://api.cerebras.ai/v1',
  perplexity: 'https://api.perplexity.ai',
  openrouter: 'https://openrouter.ai/api/v1',
  cohere: 'https://api.cohere.ai/v1', // Note: Cohere has its own SDK format
};

// =============================================================================
// LITELLM MODEL PREFIXES
// =============================================================================

export const LITELLM_PREFIXES: Record<LLMProvider, string> = {
  // Tier 1
  openai: 'openai/',
  anthropic: 'anthropic/',
  google: 'gemini/',
  xai: 'xai/',
  mistral: 'mistral/',
  cohere: 'cohere/',
  deepseek: 'deepseek/',
  // Tier 2
  azure: 'azure/',
  bedrock: 'bedrock/',
  // Tier 3
  groq: 'groq/',
  together: 'together_ai/',
  fireworks: 'fireworks_ai/',
  cerebras: 'cerebras/',
  perplexity: 'perplexity/',
  // Tier 4
  openrouter: 'openrouter/',
  // Legacy
  replicate: 'replicate/',
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
  'gpt-5-mini': { inputPer1M: 0.3, outputPer1M: 1.2 },
  // GPT-4.1 Series (April 2025)
  'gpt-4.1': { inputPer1M: 2.0, outputPer1M: 8.0 },
  'gpt-4.1-mini': { inputPer1M: 0.4, outputPer1M: 1.6 },
  'gpt-4.1-nano': { inputPer1M: 0.1, outputPer1M: 0.4 },
  // O-Series Reasoning Models
  o3: { inputPer1M: 10.0, outputPer1M: 40.0 },
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
  // Gemini 3.x Series
  'gemini-3-pro': { inputPer1M: 2.0, outputPer1M: 12.0 },
  'gemini-3-flash': { inputPer1M: 0.1, outputPer1M: 0.4 },
  // Gemini 2.5 Series
  'gemini-2.5-pro': { inputPer1M: 2.5, outputPer1M: 15.0 },
  'gemini-2.5-flash': { inputPer1M: 0.15, outputPer1M: 0.6 },
  // Gemini 2.0 Series
  'gemini-2.0-flash': { inputPer1M: 0.1, outputPer1M: 0.4 },
  'gemini-2.0-flash-lite': { inputPer1M: 0.05, outputPer1M: 0.2 },
  // Legacy
  'gemini-1.5-pro': { inputPer1M: 1.25, outputPer1M: 5.0 },
  'gemini-1.5-flash': { inputPer1M: 0.075, outputPer1M: 0.3 },

  // ==========================================================================
  // xAI (Grok)
  // ==========================================================================
  'grok-4': { inputPer1M: 2.0, outputPer1M: 10.0 },
  'grok-3': { inputPer1M: 3.0, outputPer1M: 15.0 },
  'grok-2': { inputPer1M: 2.0, outputPer1M: 10.0 },

  // ==========================================================================
  // DeepSeek
  // ==========================================================================
  'deepseek-chat': { inputPer1M: 0.14, outputPer1M: 0.28 },
  'deepseek-coder': { inputPer1M: 0.14, outputPer1M: 0.28 },
  'deepseek-reasoner': { inputPer1M: 0.55, outputPer1M: 2.19 },
  'deepseek-v3': { inputPer1M: 0.27, outputPer1M: 1.1 },

  // ==========================================================================
  // Mistral
  // ==========================================================================
  'mistral-large-latest': { inputPer1M: 2.0, outputPer1M: 6.0 },
  'mistral-medium-latest': { inputPer1M: 2.7, outputPer1M: 8.1 },
  'mistral-small-latest': { inputPer1M: 0.2, outputPer1M: 0.6 },
  codestral: { inputPer1M: 0.2, outputPer1M: 0.6 },

  // ==========================================================================
  // Cohere
  // ==========================================================================
  'command-r-plus': { inputPer1M: 2.5, outputPer1M: 10.0 },
  'command-r': { inputPer1M: 0.5, outputPer1M: 1.5 },
  'command-r7b': { inputPer1M: 0.0375, outputPer1M: 0.15 },

  // ==========================================================================
  // Groq (Ultra-fast inference)
  // ==========================================================================
  'llama-3.3-70b-versatile': { inputPer1M: 0.59, outputPer1M: 0.79 },
  'llama-3.1-8b-instant': { inputPer1M: 0.05, outputPer1M: 0.08 },
  'llama-3.1-70b-versatile': { inputPer1M: 0.59, outputPer1M: 0.79 },
  'mixtral-8x7b-32768': { inputPer1M: 0.24, outputPer1M: 0.24 },
  'gemma2-9b-it': { inputPer1M: 0.2, outputPer1M: 0.2 },

  // ==========================================================================
  // Together AI
  // ==========================================================================
  'meta-llama/Llama-3.3-70B-Instruct-Turbo': { inputPer1M: 0.88, outputPer1M: 0.88 },
  'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo': { inputPer1M: 3.5, outputPer1M: 3.5 },
  'mistralai/Mixtral-8x22B-Instruct-v0.1': { inputPer1M: 1.2, outputPer1M: 1.2 },
  'Qwen/Qwen2.5-72B-Instruct-Turbo': { inputPer1M: 1.2, outputPer1M: 1.2 },

  // ==========================================================================
  // Fireworks AI
  // ==========================================================================
  'accounts/fireworks/models/llama-v3p3-70b-instruct': { inputPer1M: 0.9, outputPer1M: 0.9 },
  'accounts/fireworks/models/mixtral-8x22b-instruct': { inputPer1M: 0.9, outputPer1M: 0.9 },
  'accounts/fireworks/models/qwen2p5-72b-instruct': { inputPer1M: 0.9, outputPer1M: 0.9 },

  // ==========================================================================
  // Cerebras (Fastest inference)
  // ==========================================================================
  'llama3.3-70b': { inputPer1M: 0.6, outputPer1M: 0.6 },
  'llama3.1-8b': { inputPer1M: 0.1, outputPer1M: 0.1 },
  'qwen-3-32b': { inputPer1M: 0.3, outputPer1M: 0.3 },

  // ==========================================================================
  // Perplexity (Search-augmented)
  // ==========================================================================
  sonar: { inputPer1M: 1.0, outputPer1M: 1.0 },
  'sonar-pro': { inputPer1M: 3.0, outputPer1M: 15.0 },
  'sonar-reasoning': { inputPer1M: 1.0, outputPer1M: 5.0 },

  // ==========================================================================
  // OpenRouter (pass-through pricing varies by model)
  // ==========================================================================
  'openai/gpt-4o': { inputPer1M: 2.5, outputPer1M: 10.0 },
  'anthropic/claude-3.5-sonnet': { inputPer1M: 3.0, outputPer1M: 15.0 },
  'google/gemini-2.0-flash': { inputPer1M: 0.1, outputPer1M: 0.4 },
};

// =============================================================================
// ENVIRONMENT VARIABLE MAPPING
// =============================================================================

/**
 * Maps providers to their environment variable names
 */
export const PROVIDER_ENV_VARS: Record<LLMProvider, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  xai: 'XAI_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  cohere: 'COHERE_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  azure: 'AZURE_OPENAI_API_KEY',
  bedrock: 'AWS_ACCESS_KEY_ID',
  groq: 'GROQ_API_KEY',
  together: 'TOGETHER_API_KEY',
  fireworks: 'FIREWORKS_API_KEY',
  cerebras: 'CEREBRAS_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  replicate: 'REPLICATE_API_KEY',
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
    // Default to gpt-4o pricing if model not found
    const defaultPricing = MODEL_PRICING['gpt-4o'];
    const inputCost = (inputTokens / 1_000_000) * defaultPricing.inputPer1M;
    const outputCost = (outputTokens / 1_000_000) * defaultPricing.outputPer1M;
    return Math.ceil((inputCost + outputCost) * 100);
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return Math.ceil((inputCost + outputCost) * 100); // Convert to cents
}

/**
 * Get the LiteLLM model string for a provider and model
 */
export function getLiteLLMModel(provider: LLMProvider, model: string): string {
  const prefix = LITELLM_PREFIXES[provider];
  if (!prefix) {
    return model;
  }
  // Don't double-prefix if already prefixed
  if (model.startsWith(prefix)) {
    return model;
  }
  return `${prefix}${model}`;
}

// Cache Object.entries at module level (js-cache-function-results)
const LITELLM_PREFIX_ENTRIES = Object.entries(LITELLM_PREFIXES) as [LLMProvider, string][];

/**
 * Extract provider from a LiteLLM model string
 */
export function getProviderFromModel(litellmModel: string): LLMProvider {
  for (const [provider, prefix] of LITELLM_PREFIX_ENTRIES) {
    if (litellmModel.startsWith(prefix)) {
      return provider;
    }
  }
  return 'openai'; // Default
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: LLMProvider): string {
  return DEFAULT_MODELS[provider];
}

/**
 * Check if a provider is in a specific tier
 */
export function isProviderInTier(provider: LLMProvider, tier: 1 | 2 | 3 | 4): boolean {
  return PROVIDER_TIERS[provider] === tier;
}

/**
 * Get the tier for a provider
 */
export function getProviderTier(provider: LLMProvider): 1 | 2 | 3 | 4 {
  return PROVIDER_TIERS[provider];
}

// Pre-built Set for O(1) lookups (js-set-map-lookups)
const NON_OPENAI_COMPATIBLE_PROVIDERS = new Set<LLMProvider>(['anthropic', 'cohere', 'azure', 'bedrock']);

/**
 * Check if a provider uses OpenAI-compatible API
 */
export function isOpenAICompatible(provider: LLMProvider): boolean {
  return !NON_OPENAI_COMPATIBLE_PROVIDERS.has(provider);
}
