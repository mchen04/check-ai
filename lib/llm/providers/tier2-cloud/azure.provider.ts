/**
 * Azure OpenAI Provider
 * Uses REST API with Azure-specific authentication
 */

import { LLMMessage, LLMOptions, LLMResponse, DEFAULT_MODELS } from '../../types';
import { BaseLLMProvider, LLMError, ProviderFactoryConfig } from '../interfaces';
import { providerRegistry } from '../registry';

// =============================================================================
// AZURE PROVIDER
// =============================================================================

export class AzureProvider extends BaseLLMProvider {
  readonly name = 'azure' as const;
  readonly tier = 2 as const;
  readonly isOpenAICompatible = true;

  constructor(config: ProviderFactoryConfig) {
    super(config);
  }

  isConfigured(): boolean {
    return !!this.keys.azureConfig;
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.azure;
  }

  async complete(
    messages: LLMMessage[],
    options: LLMOptions & { model: string }
  ): Promise<LLMResponse> {
    const config = this.keys.azureConfig;
    if (!config) {
      throw new LLMError(
        'Azure OpenAI configuration not provided. Requires endpoint, apiKey, and deploymentId.',
        this.name,
        options.model
      );
    }

    const startTime = Date.now();
    const apiVersion = config.apiVersion ?? '2024-10-21';

    // Azure uses a different endpoint format
    const url = `${config.endpoint}/openai/deployments/${config.deploymentId}/chat/completions?api-version=${apiVersion}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      return this.createResponse(
        data.choices?.[0]?.message?.content ?? '',
        {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
        },
        config.deploymentId,
        data.choices?.[0]?.finish_reason ?? 'stop',
        startTime
      );
    } catch (error) {
      throw new LLMError(
        `Azure OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        options.model,
        error
      );
    }
  }
}

// Register provider
providerRegistry.register('azure', (config) => new AzureProvider(config));
