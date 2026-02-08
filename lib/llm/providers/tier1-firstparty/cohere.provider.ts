/**
 * Cohere Provider
 * Uses native Cohere API format (different from OpenAI)
 */

import { LLMMessage, LLMOptions, LLMResponse, DEFAULT_MODELS } from '../../types';
import { BaseLLMProvider, LLMError, EmbeddingResult, ProviderFactoryConfig } from '../interfaces';
import type { ModelCapability } from '../../model-registry';
import { providerRegistry } from '../registry';

// =============================================================================
// COHERE PROVIDER
// =============================================================================

export class CohereProvider extends BaseLLMProvider {
  readonly name = 'cohere' as const;
  readonly tier = 1 as const;
  readonly isOpenAICompatible = false;

  constructor(config: ProviderFactoryConfig) {
    super(config);
  }

  isConfigured(): boolean {
    return !!this.keys.cohere;
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.cohere;
  }

  async getEmbedding(texts: string[], model?: string): Promise<EmbeddingResult | null> {
    const apiKey = this.keys.cohere;
    if (!apiKey) return null;

    const embeddingModel = model ?? 'embed-english-v4.0';

    try {
      const response = await fetch('https://api.cohere.ai/v1/embed', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts,
          model: embeddingModel,
          input_type: 'search_document',
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();

      return {
        embeddings: data.embeddings ?? [],
        model: embeddingModel,
        provider: this.name,
        usage: { inputTokens: data.meta?.billed_units?.input_tokens ?? 0 },
      };
    } catch {
      return null;
    }
  }

  getProviderCapabilities(): Set<ModelCapability> {
    return new Set(['text', 'embedding', 'search', 'tool_use', 'json_mode'] as ModelCapability[]);
  }

  async complete(
    messages: LLMMessage[],
    options: LLMOptions & { model: string }
  ): Promise<LLMResponse> {
    const apiKey = this.keys.cohere;
    if (!apiKey) {
      throw new LLMError('Cohere API key not configured', this.name, options.model);
    }

    const startTime = Date.now();

    // Convert messages to Cohere format
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatHistory = messages
      .filter((m) => m.role !== 'system')
      .slice(0, -1)
      .map((m) => ({
        role: m.role === 'user' ? 'USER' : 'CHATBOT',
        message: m.content,
      }));
    const lastMessage = messages.filter((m) => m.role !== 'system').slice(-1)[0];

    try {
      const response = await fetch('https://api.cohere.ai/v1/chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model,
          message: lastMessage?.content ?? '',
          chat_history: chatHistory,
          preamble: systemMessage?.content,
          temperature: options.temperature ?? 0.1,
          max_tokens: options.maxTokens ?? 4096,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cohere API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      return this.createResponse(
        data.text ?? '',
        {
          inputTokens: data.meta?.tokens?.input_tokens ?? 0,
          outputTokens: data.meta?.tokens?.output_tokens ?? 0,
        },
        options.model,
        data.finish_reason ?? 'COMPLETE',
        startTime
      );
    } catch (error) {
      throw new LLMError(
        `Cohere API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        options.model,
        error
      );
    }
  }
}

// Register provider
providerRegistry.register('cohere', (config) => new CohereProvider(config));
