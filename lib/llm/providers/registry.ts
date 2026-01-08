/**
 * Provider Registry
 * Singleton for registering and retrieving LLM provider instances
 */

import { LLMProvider, ExtendedProviderKeys } from '../types';
import { ILLMProvider, ProviderFactory, ProviderFactoryConfig } from './interfaces';

// =============================================================================
// PROVIDER REGISTRY
// =============================================================================

class ProviderRegistry {
  private static instance: ProviderRegistry;
  private factories: Map<LLMProvider, ProviderFactory> = new Map();

  private constructor() {}

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /**
   * Register a provider factory
   */
  register(name: LLMProvider, factory: ProviderFactory): void {
    this.factories.set(name, factory);
  }

  /**
   * Get a provider instance
   */
  get(name: LLMProvider, config: ProviderFactoryConfig): ILLMProvider | undefined {
    const factory = this.factories.get(name);
    if (!factory) {
      return undefined;
    }
    return factory(config);
  }

  /**
   * Check if a provider is registered
   */
  has(name: LLMProvider): boolean {
    return this.factories.has(name);
  }

  /**
   * Get all registered provider names
   */
  getRegisteredProviders(): LLMProvider[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Create provider instances for all configured providers
   */
  createFromKeys(keys: ExtendedProviderKeys): Map<LLMProvider, ILLMProvider> {
    const providers = new Map<LLMProvider, ILLMProvider>();
    const config: ProviderFactoryConfig = { keys };

    this.factories.forEach((factory, name) => {
      const provider = factory(config);
      if (provider.isConfigured()) {
        providers.set(name, provider);
      }
    });

    return providers;
  }
}

// Export singleton instance
export const providerRegistry = ProviderRegistry.getInstance();

// =============================================================================
// PROVIDER TIERS
// =============================================================================

export const PROVIDER_TIERS: Record<LLMProvider, 1 | 2 | 3 | 4> = {
  // Tier 1: First-party providers
  openai: 1,
  anthropic: 1,
  google: 1,
  xai: 1,
  mistral: 1,
  cohere: 1,
  deepseek: 1,
  // Tier 2: Cloud providers
  azure: 2,
  bedrock: 2,
  // Tier 3: Inference providers
  groq: 3,
  together: 3,
  fireworks: 3,
  cerebras: 3,
  perplexity: 3,
  // Tier 4: Gateways
  openrouter: 4,
  // Legacy
  replicate: 1,
};

/**
 * Get providers by tier
 */
export function getProvidersByTier(tier: 1 | 2 | 3 | 4): LLMProvider[] {
  return Object.entries(PROVIDER_TIERS)
    .filter(([, t]) => t === tier)
    .map(([name]) => name as LLMProvider);
}
