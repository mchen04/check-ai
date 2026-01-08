/**
 * Anthropic Provider
 * Native SDK implementation for Claude models
 */

import Anthropic from '@anthropic-ai/sdk';
import { LLMMessage, LLMOptions, LLMResponse, DEFAULT_MODELS } from '../../types';
import { BaseLLMProvider, LLMError, ProviderFactoryConfig } from '../interfaces';
import { providerRegistry } from '../registry';

// =============================================================================
// ANTHROPIC PROVIDER
// =============================================================================

export class AnthropicProvider extends BaseLLMProvider {
  readonly name = 'anthropic' as const;
  readonly tier = 1 as const;
  readonly isOpenAICompatible = false;

  private client?: Anthropic;

  constructor(config: ProviderFactoryConfig) {
    super(config);
    if (this.keys.anthropic) {
      this.client = new Anthropic({ apiKey: this.keys.anthropic });
    }
  }

  isConfigured(): boolean {
    return !!this.keys.anthropic;
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.anthropic;
  }

  async complete(
    messages: LLMMessage[],
    options: LLMOptions & { model: string }
  ): Promise<LLMResponse> {
    if (!this.client) {
      throw new LLMError('Anthropic API key not configured', this.name, options.model);
    }

    const startTime = Date.now();

    // Anthropic uses a separate system parameter
    const systemMessage = messages.find((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    try {
      const response = await this.client.messages.create({
        model: options.model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.1,
        system: systemMessage?.content,
        messages: nonSystemMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      const content = response.content[0]?.type === 'text' ? response.content[0].text : '';

      return this.createResponse(
        content,
        {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        response.model,
        response.stop_reason ?? 'end_turn',
        startTime
      );
    } catch (error) {
      throw new LLMError(
        `Anthropic API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        options.model,
        error
      );
    }
  }
}

// Register provider
providerRegistry.register('anthropic', (config) => new AnthropicProvider(config));
