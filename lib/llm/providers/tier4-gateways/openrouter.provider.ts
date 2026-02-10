/**
 * OpenRouter Provider
 * Unified gateway supporting multiple upstream providers
 * Extends OpenAICompatibleProvider with custom headers for attribution
 */

import { DEFAULT_MODELS } from '../../types';
import { OpenAICompatibleProvider } from '../../shared/openai-compatible';
import { providerRegistry } from '../registry';

// =============================================================================
// OPENROUTER PROVIDER
// =============================================================================

export class OpenRouterProvider extends OpenAICompatibleProvider {
  readonly name = 'openrouter' as const;
  readonly tier = 4 as const;

  protected getApiKey(): string | undefined {
    return this.keys.openrouter;
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.openrouter;
  }

  protected getExtraClientOptions(): Record<string, unknown> {
    return {
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_REFERER ?? 'https://check.ai',
        'X-Title': process.env.OPENROUTER_TITLE ?? 'Check',
      },
    };
  }
}

// Register provider
providerRegistry.register('openrouter', (config) => new OpenRouterProvider(config));
