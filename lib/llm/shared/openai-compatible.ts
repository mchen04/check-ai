/**
 * OpenAI-Compatible Provider Base Class
 * Shared implementation for providers using the OpenAI API format
 *
 * Used by: Google, xAI, Mistral, DeepSeek, Groq, Together, Fireworks, Cerebras, Perplexity
 */

import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import { LLMMessage, LLMOptions, LLMResponse, TokenLogprob, LLMProvider, PROVIDER_BASE_URLS } from '../types';
import { BaseLLMProvider, LLMError, EmbeddingResult } from '../providers/interfaces';
import type { ModelCapability } from '../model-registry';

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
   * Override to pass extra options to the OpenAI client (e.g., custom headers).
   */
  protected getExtraClientOptions(): Record<string, unknown> {
    return {};
  }

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

  /**
   * Override in subclass to return an embedding model ID, or null if unsupported.
   */
  getDefaultEmbeddingModel(): string | null {
    return null;
  }

  async getEmbedding(texts: string[], model?: string): Promise<EmbeddingResult | null> {
    const embeddingModel = model ?? this.getDefaultEmbeddingModel();
    if (!embeddingModel) return null;

    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({
        apiKey,
        baseURL: this.getBaseUrl(),
        ...this.getExtraClientOptions(),
      });

      const response = await client.embeddings.create({
        model: embeddingModel,
        input: texts,
      });

      const embeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);

      return {
        embeddings,
        model: embeddingModel,
        provider: this.name,
        usage: { inputTokens: response.usage?.prompt_tokens ?? 0 },
      };
    } catch {
      return null;
    }
  }

  getProviderCapabilities(): Set<ModelCapability> {
    const caps: ModelCapability[] = ['text'];
    if (this.getDefaultEmbeddingModel()) {
      caps.push('embedding');
    }
    return new Set(caps);
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

    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({
      apiKey,
      baseURL: this.getBaseUrl(),
      ...this.getExtraClientOptions(),
    });

    try {
      const params: ChatCompletionCreateParamsNonStreaming = {
        model: options.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature ?? 0.1,
        max_tokens: options.maxTokens ?? 4096,
        top_p: options.topP ?? undefined,
        frequency_penalty: options.frequencyPenalty ?? undefined,
        presence_penalty: options.presencePenalty ?? undefined,
      };

      if (options.logprobs) {
        params.logprobs = true;
        if (options.topLogprobs) {
          params.top_logprobs = options.topLogprobs;
        }
      }

      const response = await client.chat.completions.create(params);

      // Extract logprobs if available
      let logprobsData: TokenLogprob[] | undefined;
      const choiceLogprobs = response.choices[0]?.logprobs;
      if (choiceLogprobs?.content) {
        logprobsData = choiceLogprobs.content.map((lp) => ({
          token: lp.token,
          logprob: lp.logprob,
          topLogprobs: lp.top_logprobs?.map((tlp) => ({
            token: tlp.token,
            logprob: tlp.logprob,
          })),
        }));
      }

      const result = this.createResponse(
        response.choices[0]?.message?.content ?? '',
        {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
        response.model || options.model,
        response.choices[0]?.finish_reason ?? 'stop',
        startTime
      );

      if (logprobsData) {
        result.logprobs = logprobsData;
      }

      return result;
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
