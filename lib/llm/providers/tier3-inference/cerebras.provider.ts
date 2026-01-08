/**
 * Cerebras Provider
 * Fastest inference using OpenAI-compatible API
 */

import { DEFAULT_MODELS } from '../../types';
import { ProviderFactoryConfig } from '../interfaces';
import { providerRegistry } from '../registry';
import { OpenAICompatibleProvider } from '../../shared/openai-compatible';

// =============================================================================
// CEREBRAS PROVIDER
// =============================================================================

export class CerebrasProvider extends OpenAICompatibleProvider {
  readonly name = 'cerebras' as const;
  readonly tier = 3 as const;

  constructor(config: ProviderFactoryConfig) {
    super(config);
  }

  protected getApiKey(): string | undefined {
    return this.keys.cerebras;
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.cerebras;
  }
}

// Register provider
providerRegistry.register('cerebras', (config) => new CerebrasProvider(config));
