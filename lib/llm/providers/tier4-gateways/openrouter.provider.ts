/**
 * OpenRouter Provider
 * Unified gateway supporting multiple upstream providers
 * Uses REST API with custom headers for attribution
 */

import { LLMMessage, LLMOptions, LLMResponse, DEFAULT_MODELS } from '../../types';
import { BaseLLMProvider, LLMError, ProviderFactoryConfig } from '../interfaces';
import { providerRegistry } from '../registry';

// =============================================================================
// OPENROUTER PROVIDER
// =============================================================================

export class OpenRouterProvider extends BaseLLMProvider {
  readonly name = 'openrouter' as const;
  readonly tier = 4 as const;
  readonly isOpenAICompatible = true;

  constructor(config: ProviderFactoryConfig) {
    super(config);
  }

  isConfigured(): boolean {
    return !!this.keys.openrouter;
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.openrouter;
  }

  async complete(
    messages: LLMMessage[],
    options: LLMOptions & { model: string }
  ): Promise<LLMResponse> {
    const apiKey = this.keys.openrouter;
    if (!apiKey) {
      throw new LLMError('OpenRouter API key not configured', this.name, options.model);
    }

    const startTime = Date.now();

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERER ?? 'https://verifyai.dev',
          'X-Title': process.env.OPENROUTER_TITLE ?? 'VerifyAI',
        },
        body: JSON.stringify({
          model: options.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: options.temperature ?? 0.1,
          max_tokens: options.maxTokens ?? 4096,
          top_p: options.topP,
          frequency_penalty: options.frequencyPenalty,
          presence_penalty: options.presencePenalty,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      return this.createResponse(
        data.choices?.[0]?.message?.content ?? '',
        {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
        },
        data.model || options.model,
        data.choices?.[0]?.finish_reason ?? 'stop',
        startTime
      );
    } catch (error) {
      throw new LLMError(
        `OpenRouter API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        options.model,
        error
      );
    }
  }
}

// Register provider
providerRegistry.register('openrouter', (config) => new OpenRouterProvider(config));
