/**
 * LLM Module Barrel Export
 */

// Types
export {
  type LLMProvider,
  type LLMMessage,
  type LLMOptions,
  type LLMUsage,
  type LLMResponse,
  type TokenLogprob,
  type ProviderConfig,
  type AzureOpenAIConfig,
  type BedrockConfig,
  type ProviderKeys,
  type ExtendedProviderKeys,
  type ModelCapability,
  type ModelInfo,
  type ModelQuery,
  type EmbeddingResult,
  PROVIDER_BASE_URLS,
  calculateCostCents,
} from './types';

// Model Registry
export { ModelRegistry } from './model-registry';

// Client
export { LLMClient, createLLMClient } from './client';

// Key Manager
export {
  encrypt,
  decrypt,
  hashApiKey,
  generateKeyPrefix,
  generatePlatformApiKey,
  getKeyManager,
  getDecryptedApiKeys,
} from './key-manager';

// Provider UI Config
export {
  type ProviderUIConfig,
  type ProviderSelectOption,
  PROVIDER_UI_CONFIG,
  PROVIDER_OPTIONS,
  ALL_PROVIDER_OPTIONS,
  PROVIDER_COLORS,
  getProviderColor,
  getProviderLabel,
  getProviderDescription,
  isEnterpriseProvider,
} from './provider-ui-config';
