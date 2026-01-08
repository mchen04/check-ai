/**
 * OpenAI Provider
 * Native SDK implementation for OpenAI models
 */

import OpenAI from 'openai';
import { LLMMessage, LLMOptions, LLMResponse, DEFAULT_MODELS } from '../../types';
import { BaseLLMProvider, LLMError, ProviderFactoryConfig } from '../interfaces';
import { providerRegistry } from '../registry';

// =============================================================================
// OPENAI PROVIDER
// =============================================================================

export class OpenAIProvider extends BaseLLMProvider {
  readonly name = 'openai' as const;
  readonly tier = 1 as const;
  readonly isOpenAICompatible = true;

  private client?: OpenAI;

  constructor(config: ProviderFactoryConfig) {
    super(config);
    if (this.keys.openai) {
      this.client = new OpenAI({ apiKey: this.keys.openai });
    }
  }

  isConfigured(): boolean {
    return !!this.keys.openai;
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.openai;
  }

  async complete(
    messages: LLMMessage[],
    options: LLMOptions & { model: string }
  ): Promise<LLMResponse> {
    if (!this.client) {
      throw new LLMError('OpenAI API key not configured', this.name, options.model);
    }

    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
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
      });

      return this.createResponse(
        response.choices[0]?.message?.content ?? '',
        {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
        response.model,
        response.choices[0]?.finish_reason ?? 'stop',
        startTime
      );
    } catch (error) {
      throw new LLMError(
        `OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        options.model,
        error
      );
    }
  }
}

// Register provider
providerRegistry.register('openai', (config) => new OpenAIProvider(config));
