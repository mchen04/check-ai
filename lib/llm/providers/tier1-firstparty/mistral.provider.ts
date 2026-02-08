/**
 * Mistral Provider
 * Uses OpenAI-compatible API format
 */

import { DEFAULT_MODELS } from '../../types';
import { ProviderFactoryConfig } from '../interfaces';
import { providerRegistry } from '../registry';
import { OpenAICompatibleProvider } from '../../shared/openai-compatible';

// =============================================================================
// MISTRAL PROVIDER
// =============================================================================

export class MistralProvider extends OpenAICompatibleProvider {
  readonly name = 'mistral' as const;
  readonly tier = 1 as const;

  constructor(config: ProviderFactoryConfig) {
    super(config);
  }

  protected getApiKey(): string | undefined {
    return this.keys.mistral;
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.mistral;
  }

  getDefaultEmbeddingModel(): string | null {
    return 'mistral-embed';
  }
}

// Register provider
providerRegistry.register('mistral', (config) => new MistralProvider(config));
