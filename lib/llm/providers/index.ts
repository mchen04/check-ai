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

// Export individual provider classes
export * from './tier1-firstparty';
export * from './tier2-cloud';
export * from './tier3-inference';
export * from './tier4-gateways';
