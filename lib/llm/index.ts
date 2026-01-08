/**
 * LLM Module Exports
 * Unified interface for multi-provider LLM interactions
 */

// Types
export * from './types';

// Client
export { LLMClient, LLMError, createLLMClient, createLLMClientFromEnv } from './client';

// Provider interfaces and registry (for custom provider implementations)
export { providerRegistry, BaseLLMProvider, PROVIDER_TIERS, getProvidersByTier } from './providers';
export type { ILLMProvider, ProviderFactory, ProviderFactoryConfig } from './providers';

// OpenAI-compatible base class (for creating OpenAI-compatible providers)
export { OpenAICompatibleProvider } from './shared/openai-compatible';

// Key Manager
export {
  KeyManager,
  getKeyManager,
  encrypt,
  decrypt,
  hashApiKey,
  generatePlatformApiKey,
} from './key-manager';
