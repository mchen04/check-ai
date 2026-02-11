/**
 * LLM Providers
 * Auto-registers all providers on import
 */

// Import all tiers to trigger registration
import './tier1-firstparty';
import './tier2-cloud';
import './tier4-gateways';

// Export registry and interfaces
export { providerRegistry, PROVIDER_TIERS, getProvidersByTier } from './registry';
export { BaseLLMProvider, LLMError } from './interfaces';
export type { ILLMProvider, ProviderFactory, ProviderFactoryConfig } from './interfaces';

// Export individual provider classes - Named exports for tree-shaking
export {
  OpenAIProvider,
  AnthropicProvider,
  GoogleProvider,
  MistralProvider,
} from './tier1-firstparty';

export { AzureProvider, BedrockProvider } from './tier2-cloud';

export { OpenRouterProvider } from './tier4-gateways';
