/**
 * Groq Provider
 * Ultra-fast inference using OpenAI-compatible API
 */

import { DEFAULT_MODELS } from '../../types';
import { ProviderFactoryConfig } from '../interfaces';
import { providerRegistry } from '../registry';
import { OpenAICompatibleProvider } from '../../shared/openai-compatible';

// =============================================================================
// GROQ PROVIDER
// =============================================================================

export class GroqProvider extends OpenAICompatibleProvider {
  readonly name = 'groq' as const;
  readonly tier = 3 as const;

  constructor(config: ProviderFactoryConfig) {
    super(config);
  }

  protected getApiKey(): string | undefined {
    return this.keys.groq;
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.groq;
  }
}

// Register provider
providerRegistry.register('groq', (config) => new GroqProvider(config));
