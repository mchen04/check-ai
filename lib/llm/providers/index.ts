/**
 * LLM Providers
 * Auto-registers all providers on import
 */

// Import all tiers to trigger registration
import './tier1-firstparty';
import './tier2-cloud';
import './tier3-inference';
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
  XAIProvider,
  MistralProvider,
  CohereProvider,
  DeepSeekProvider,
} from './tier1-firstparty';

export { AzureProvider, BedrockProvider } from './tier2-cloud';

export {
  GroqProvider,
  TogetherProvider,
  FireworksProvider,
  CerebrasProvider,
  PerplexityProvider,
} from './tier3-inference';

export { OpenRouterProvider } from './tier4-gateways';
