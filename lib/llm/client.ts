/**
 * Unified LLM Client (Facade)
 * Provides a consistent interface for calling 16+ LLM providers
 * Supports BYOK (Bring Your Own Key) with OpenAI-compatible APIs
 *
 * Provider Tiers:
 * - Tier 1: First-party (OpenAI, Anthropic, Google, xAI, Mistral, Cohere, DeepSeek)
 * - Tier 2: Cloud (Azure OpenAI, AWS Bedrock)
 * - Tier 3: Inference (Groq, Together, Fireworks, Cerebras, Perplexity)
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

/**
 * Create an LLM client from environment variables
 */
export function createLLMClientFromEnv(): LLMClient {
  return new LLMClient({
    // Tier 1: First-party
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GOOGLE_API_KEY,
    xai: process.env.XAI_API_KEY,
    mistral: process.env.MISTRAL_API_KEY,
    cohere: process.env.COHERE_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
    // Tier 2: Cloud (requires config objects for full setup)
    azure: process.env.AZURE_OPENAI_API_KEY,
    bedrock: process.env.AWS_ACCESS_KEY_ID,
    // Azure config from env
    azureConfig: process.env.AZURE_OPENAI_ENDPOINT
      ? {
          apiKey: process.env.AZURE_OPENAI_API_KEY ?? '',
          endpoint: process.env.AZURE_OPENAI_ENDPOINT,
          deploymentId: process.env.AZURE_OPENAI_DEPLOYMENT_ID ?? '',
          apiVersion: process.env.AZURE_OPENAI_API_VERSION,
        }
      : undefined,
    // Bedrock config from env
    bedrockConfig: process.env.AWS_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
          region: process.env.AWS_REGION ?? 'us-east-1',
          sessionToken: process.env.AWS_SESSION_TOKEN,
        }
      : undefined,
    // Tier 3: Inference
    groq: process.env.GROQ_API_KEY,
    together: process.env.TOGETHER_API_KEY,
    fireworks: process.env.FIREWORKS_API_KEY,
    cerebras: process.env.CEREBRAS_API_KEY,
    perplexity: process.env.PERPLEXITY_API_KEY,
    // Tier 4: Gateways
    openrouter: process.env.OPENROUTER_API_KEY,
  });
}
