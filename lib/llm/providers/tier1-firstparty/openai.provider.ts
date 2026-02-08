/**
 * OpenAI Provider
 * Native SDK implementation for OpenAI models
 */

import OpenAI from 'openai';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import { LLMMessage, LLMOptions, LLMResponse, TokenLogprob, DEFAULT_MODELS } from '../../types';
import { BaseLLMProvider, LLMError, EmbeddingResult, ProviderFactoryConfig } from '../interfaces';
import type { ModelCapability } from '../../model-registry';
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

  async getEmbedding(texts: string[], model?: string): Promise<EmbeddingResult | null> {
    if (!this.client) return null;
    const embeddingModel = model ?? 'text-embedding-3-small';

    try {
      const response = await this.client.embeddings.create({
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
    return new Set(['text', 'embedding', 'logprobs', 'tool_use', 'vision', 'json_mode'] as ModelCapability[]);
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

      const response = await this.client.chat.completions.create(params);

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
        response.model,
        response.choices[0]?.finish_reason ?? 'stop',
        startTime
      );

      if (logprobsData) {
        result.logprobs = logprobsData;
      }

      return result;
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
