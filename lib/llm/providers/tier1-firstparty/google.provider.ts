/**
 * Google (Gemini) Provider
 * Uses OpenAI-compatible API format
 */

import { DEFAULT_MODELS } from '../../types';
import { ProviderFactoryConfig } from '../interfaces';
import { providerRegistry } from '../registry';
import { OpenAICompatibleProvider } from '../../shared/openai-compatible';

// =============================================================================
// GOOGLE PROVIDER
// =============================================================================

export class GoogleProvider extends OpenAICompatibleProvider {
  readonly name = 'google' as const;
  readonly tier = 1 as const;

  constructor(config: ProviderFactoryConfig) {
    super(config);
  }

  protected getApiKey(): string | undefined {
    return this.keys.google;
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.google;
  }

  getDefaultEmbeddingModel(): string | null {
    return 'text-embedding-004';
  }
}

// Register provider
providerRegistry.register('google', (config) => new GoogleProvider(config));
