/**
 * Fireworks AI Provider
 * Fast inference using OpenAI-compatible API
 */

import { DEFAULT_MODELS } from '../../types';
import { ProviderFactoryConfig } from '../interfaces';
import { providerRegistry } from '../registry';
import { OpenAICompatibleProvider } from '../../shared/openai-compatible';

// =============================================================================
// FIREWORKS PROVIDER
// =============================================================================

export class FireworksProvider extends OpenAICompatibleProvider {
  readonly name = 'fireworks' as const;
  readonly tier = 3 as const;

  constructor(config: ProviderFactoryConfig) {
    super(config);
  }

  protected getApiKey(): string | undefined {
    return this.keys.fireworks;
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.fireworks;
  }
}

// Register provider
providerRegistry.register('fireworks', (config) => new FireworksProvider(config));
