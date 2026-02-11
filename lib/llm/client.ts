/**
 * Unified LLM Client (Facade)
 * Provides a consistent interface for calling 7 LLM providers
 * Supports BYOK (Bring Your Own Key) with OpenAI-compatible APIs
 *
 * Provider Tiers:
 * - Tier 1: First-party (OpenAI, Anthropic, Google, Mistral)
 * - Tier 2: Cloud (Azure OpenAI, AWS Bedrock)
 * - Tier 4: Gateways (OpenRouter)
 */

import {
  LLMMessage,
  LLMOptions,
  LLMResponse,
  LLMProvider,
  ExtendedProviderKeys,
  DEFAULT_MODELS,
} from './types';
// Import providers - this triggers registration
import './providers';
import { providerRegistry, ILLMProvider, LLMError, getProvidersByTier } from './providers';
import type { EmbeddingResult } from './providers/interfaces';
import type { ModelCapability } from './model-registry';
import { ModelRegistry } from './model-registry';

// Re-export LLMError for backwards compatibility
export { LLMError };

// =============================================================================
// LLM CLIENT CLASS (FACADE)
// =============================================================================

export class LLMClient {
  private providers: Map<LLMProvider, ILLMProvider>;
  private providerKeys: ExtendedProviderKeys;

  constructor(keys: ExtendedProviderKeys) {
    this.providerKeys = keys;
    this.providers = providerRegistry.createFromKeys(keys);
  }

  /**
   * Generate a completion using the specified provider and model
   */
  async complete(
    provider: LLMProvider,
    messages: LLMMessage[],
    options: LLMOptions = {}
  ): Promise<LLMResponse> {
    const providerInstance = this.providers.get(provider);

    if (!providerInstance) {
      throw new LLMError(
        `Provider not configured: ${provider}`,
        provider,
        options.model || 'unknown'
      );
    }

    const model = options.model || providerInstance.getDefaultModel();

    try {
      return await providerInstance.complete(messages, { ...options, model });
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      throw new LLMError(
        `Failed to complete with ${provider}/${model}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider,
        model,
        error
      );
    }
  }

  /**
   * Check if a provider is available (has API key configured)
   */
  hasProvider(provider: LLMProvider): boolean {
    return this.providers.has(provider);
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get providers by tier
   */
  getProvidersByTier(tier: 1 | 2 | 3 | 4): LLMProvider[] {
    return getProvidersByTier(tier).filter((p) => this.hasProvider(p));
  }

  /**
   * Get default model for a provider
   */
  getDefaultModel(provider: LLMProvider): string {
    const providerInstance = this.providers.get(provider);
    return providerInstance?.getDefaultModel() || DEFAULT_MODELS[provider];
  }

  /**
   * Generate embeddings using the specified provider
   */
  async getEmbedding(
    provider: LLMProvider,
    texts: string[],
    model?: string
  ): Promise<EmbeddingResult | null> {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance?.getEmbedding) return null;
    return providerInstance.getEmbedding(texts, model);
  }

  /**
   * Get the provider instance for direct access
   */
  getProviderInstance(provider: LLMProvider): ILLMProvider | undefined {
    return this.providers.get(provider);
  }

  /**
   * Find the first available provider that has a given capability
   */
  findProviderWithCapability(
    capability: ModelCapability,
    preferenceOrder?: LLMProvider[]
  ): LLMProvider | null {
    const registry = ModelRegistry.getInstance();
    const order = preferenceOrder ?? Array.from(this.providers.keys());

    for (const provider of order) {
      if (!this.providers.has(provider)) continue;

      const providerInstance = this.providers.get(provider)!;
      if (providerInstance.getProviderCapabilities().has(capability)) {
        return provider;
      }

      // Fallback: check registry for models with this capability
      const model = registry.findBestModel({ provider, capabilities: [capability] });
      if (model) return provider;
    }

    return null;
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create an LLM client with the provided API keys
 */
export function createLLMClient(keys: ExtendedProviderKeys): LLMClient {
  return new LLMClient(keys);
}
