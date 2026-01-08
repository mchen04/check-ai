/**
 * Provider Registry
 * Singleton for registering and retrieving LLM provider instances
 */

import { LLMProvider, ExtendedProviderKeys } from '../types';
import { ILLMProvider, ProviderFactory, ProviderFactoryConfig } from './interfaces';

// Re-export PROVIDER_TIERS and getProvidersByTier from config for backward compatibility
// These are now centralized in ../config.ts
export { PROVIDER_TIERS, getProvidersByTier } from '../config';

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

// Note: PROVIDER_TIERS and getProvidersByTier are re-exported from ../config.ts at the top of this file
