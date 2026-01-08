/**
 * LLM Types and Interfaces
 * Unified types for multi-provider LLM interactions
 * Supports 16+ providers with BYOK (Bring Your Own Key)
 */

// =============================================================================
// PROVIDER TYPES
// =============================================================================

/**
 * Tier 1: First-party providers (direct APIs)
 * Tier 2: Cloud providers (enterprise - Azure, Bedrock)
 * Tier 3: Inference providers (fast/cheap)
 * Tier 4: Unified gateways (meta-providers)
 */
export type LLMProvider =
  // Tier 1: First-party providers
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'xai'
  | 'mistral'
  | 'cohere'
  | 'deepseek'
  // Tier 2: Cloud providers (enterprise)
  | 'azure'
  | 'bedrock'
  // Tier 3: Inference providers
  | 'groq'
  | 'together'
  | 'fireworks'
  | 'cerebras'
  | 'perplexity'
  // Tier 4: Unified gateways
  | 'openrouter'
  // Legacy
  | 'replicate';

// =============================================================================
// MESSAGE TYPES (OpenAI-compatible format)
// =============================================================================

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeout?: number;
  stream?: boolean;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface LLMResponse {
  content: string;
  usage: LLMUsage;
  model: string;
  provider: LLMProvider;
  finishReason: string;
  latencyMs: number;
}

// =============================================================================
// PROVIDER CONFIGURATION
// =============================================================================

export interface ProviderConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  organizationId?: string;
}

/**
 * Azure OpenAI requires additional configuration beyond just an API key
 */
export interface AzureOpenAIConfig {
  apiKey: string;
  endpoint: string; // e.g., https://your-resource.openai.azure.com
  deploymentId: string; // The deployment name, not the model name
  apiVersion?: string; // Defaults to 2024-10-21
}

/**
 * AWS Bedrock uses AWS credentials instead of API keys
 */
export interface BedrockConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string; // e.g., us-east-1
  sessionToken?: string; // For temporary credentials
}

/**
 * Provider API keys - simple string keys for most providers
 * Azure and Bedrock have their own config objects
 */
export interface ProviderKeys {
  // Tier 1: First-party providers
  openai?: string;
  anthropic?: string;
  google?: string;
  xai?: string;
  mistral?: string;
  cohere?: string;
  deepseek?: string;
  // Tier 2: Cloud providers (enterprise) - these use config objects
  azure?: string; // Simple key for validation, use AzureOpenAIConfig for full config
  bedrock?: string; // Simple key for validation, use BedrockConfig for full config
  // Tier 3: Inference providers
  groq?: string;
  together?: string;
  fireworks?: string;
  cerebras?: string;
  perplexity?: string;
  // Tier 4: Unified gateways
  openrouter?: string;
  // Legacy
  replicate?: string;
}

/**
 * Extended provider keys with full Azure/Bedrock configuration
 */
export interface ExtendedProviderKeys extends ProviderKeys {
  azureConfig?: AzureOpenAIConfig;
  bedrockConfig?: BedrockConfig;
}

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

/**
 * Extract provider from a LiteLLM model string
 */
export function getProviderFromModel(litellmModel: string): LLMProvider {
  for (const [provider, prefix] of Object.entries(LITELLM_PREFIXES)) {
    if (litellmModel.startsWith(prefix)) {
      return provider as LLMProvider;
    }
  }
  return 'openai'; // Default
}
