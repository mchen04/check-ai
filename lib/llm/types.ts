/**
 * LLM Types and Interfaces
 * Unified types for multi-provider LLM interactions
 * Supports 16+ providers with BYOK (Bring Your Own Key)
 *
 * NOTE: Provider configuration constants (DEFAULT_MODELS, MODEL_PRICING, etc.)
 * are centralized in ./config.ts. This file re-exports them for backward compatibility.
 */

// Re-export configuration constants from centralized config
// This provides backward compatibility for existing imports
export {
  DEFAULT_MODELS,
  MODEL_PRICING,
  PROVIDER_BASE_URLS,
  LITELLM_PREFIXES,
  PROVIDER_TIERS,
  PROVIDER_ENV_VARS,
  ALL_PROVIDERS,
  calculateCostCents,
  getLiteLLMModel,
  getProviderFromModel,
  getDefaultModel,
  getProvidersByTier,
  getProviderTier,
  isProviderInTier,
  isOpenAICompatible,
  getModelsForProvider,
  isModelCompatibleWithProvider,
  type ModelPricing,
} from './config';

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
// NOTE: MODEL_PRICING, DEFAULT_MODELS, PROVIDER_BASE_URLS, LITELLM_PREFIXES,
// and helper functions are now defined in ./config.ts and re-exported above.
// =============================================================================
