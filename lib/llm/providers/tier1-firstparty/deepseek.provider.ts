/**
 * DeepSeek Provider
 * Uses OpenAI-compatible API format
 */

import { DEFAULT_MODELS } from '../../types';
import { ProviderFactoryConfig } from '../interfaces';
import { providerRegistry } from '../registry';
import { OpenAICompatibleProvider } from '../../shared/openai-compatible';

// =============================================================================
// DEEPSEEK PROVIDER
// =============================================================================

export class DeepSeekProvider extends OpenAICompatibleProvider {
  readonly name = 'deepseek' as const;
  readonly tier = 1 as const;

  constructor(config: ProviderFactoryConfig) {
    super(config);
  }

  protected getApiKey(): string | undefined {
    return this.keys.deepseek;
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.deepseek;
  }
}

// Register provider
providerRegistry.register('deepseek', (config) => new DeepSeekProvider(config));
