/**
 * xAI (Grok) Provider
 * Uses OpenAI-compatible API format
 */

import { DEFAULT_MODELS } from '../../types';
import { ProviderFactoryConfig } from '../interfaces';
import { providerRegistry } from '../registry';
import { OpenAICompatibleProvider } from '../../shared/openai-compatible';

// =============================================================================
// XAI PROVIDER
// =============================================================================

export class XAIProvider extends OpenAICompatibleProvider {
  readonly name = 'xai' as const;
  readonly tier = 1 as const;

  constructor(config: ProviderFactoryConfig) {
    super(config);
  }

  protected getApiKey(): string | undefined {
    return this.keys.xai;
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.xai;
  }
}

// Register provider
providerRegistry.register('xai', (config) => new XAIProvider(config));
