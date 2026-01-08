/**
 * OpenAI-Compatible Provider Base Class
 * Shared implementation for providers using the OpenAI API format
 *
 * Used by: Google, xAI, Mistral, DeepSeek, Groq, Together, Fireworks, Cerebras, Perplexity
 */

import OpenAI from 'openai';
import { LLMMessage, LLMOptions, LLMResponse, LLMProvider, PROVIDER_BASE_URLS } from '../types';
import { BaseLLMProvider, LLMError } from '../providers/interfaces';

// =============================================================================
// OPENAI-COMPATIBLE BASE CLASS
// =============================================================================

export abstract class OpenAICompatibleProvider extends BaseLLMProvider {
  readonly isOpenAICompatible = true;

  /**
   * Get the API key for this provider
   */
  protected abstract getApiKey(): string | undefined;

  /**
   * Get the base URL for this provider
   */
  protected getBaseUrl(): string {
    const url = PROVIDER_BASE_URLS[this.name];
    if (!url) {
      throw new LLMError(
        `Base URL not configured for provider: ${this.name}`,
        this.name,
        'unknown'
      );
    }
    return url;
  }

  isConfigured(): boolean {
    return !!this.getApiKey();
  }

  async complete(
    messages: LLMMessage[],
    options: LLMOptions & { model: string }
  ): Promise<LLMResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new LLMError(
        `${this.name} API key not configured`,
        this.name,
        options.model
      );
    }

    const startTime = Date.now();

    const client = new OpenAI({
      apiKey,
      baseURL: this.getBaseUrl(),
    });

    try {
      const response = await client.chat.completions.create({
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
        response.model || options.model,
        response.choices[0]?.finish_reason ?? 'stop',
        startTime
      );
    } catch (error) {
      throw new LLMError(
        `${this.name} API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        options.model,
        error
      );
    }
  }
}
