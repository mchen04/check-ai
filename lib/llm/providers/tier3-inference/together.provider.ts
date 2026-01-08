/**
 * Together AI Provider
 * Fast inference using OpenAI-compatible API
 */

import { DEFAULT_MODELS } from '../../types';
import { ProviderFactoryConfig } from '../interfaces';
import { providerRegistry } from '../registry';
import { OpenAICompatibleProvider } from '../../shared/openai-compatible';

// =============================================================================
// TOGETHER PROVIDER
// =============================================================================

export class TogetherProvider extends OpenAICompatibleProvider {
  readonly name = 'together' as const;
  readonly tier = 3 as const;

  constructor(config: ProviderFactoryConfig) {
    super(config);
  }

  protected getApiKey(): string | undefined {
    return this.keys.together;
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.together;
  }
}

// Register provider
providerRegistry.register('together', (config) => new TogetherProvider(config));
