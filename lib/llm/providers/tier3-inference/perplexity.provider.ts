/**
 * Perplexity Provider
 * Search-augmented inference using OpenAI-compatible API
 */

import { DEFAULT_MODELS } from '../../types';
import { ProviderFactoryConfig } from '../interfaces';
import { providerRegistry } from '../registry';
import { OpenAICompatibleProvider } from '../../shared/openai-compatible';

// =============================================================================
// PERPLEXITY PROVIDER
// =============================================================================

export class PerplexityProvider extends OpenAICompatibleProvider {
  readonly name = 'perplexity' as const;
  readonly tier = 3 as const;

  constructor(config: ProviderFactoryConfig) {
    super(config);
  }

  protected getApiKey(): string | undefined {
    return this.keys.perplexity;
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.perplexity;
  }
}

// Register provider
providerRegistry.register('perplexity', (config) => new PerplexityProvider(config));
