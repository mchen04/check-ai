/**
 * AWS Bedrock Provider
 * Uses AWS SDK for authentication and model invocation
 */

import { LLMMessage, LLMOptions, LLMResponse, DEFAULT_MODELS } from '../../types';
import { BaseLLMProvider, LLMError, ProviderFactoryConfig } from '../interfaces';
import { providerRegistry } from '../registry';

// =============================================================================
// BEDROCK PROVIDER
// =============================================================================

export class BedrockProvider extends BaseLLMProvider {
  readonly name = 'bedrock' as const;
  readonly tier = 2 as const;
  readonly isOpenAICompatible = false;

  constructor(config: ProviderFactoryConfig) {
    super(config);
  }

  isConfigured(): boolean {
    return !!this.keys.bedrockConfig;
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.bedrock;
  }

  async complete(
    messages: LLMMessage[],
    options: LLMOptions & { model: string }
  ): Promise<LLMResponse> {
    const config = this.keys.bedrockConfig;
    if (!config) {
      throw new LLMError(
        'AWS Bedrock configuration not provided. Requires accessKeyId, secretAccessKey, and region.',
        this.name,
        options.model
      );
    }

    const startTime = Date.now();

    try {
      // Dynamic import of AWS SDK to avoid bundling issues
      const {
        BedrockRuntimeClient,
        InvokeModelCommand,
      } = await import('@aws-sdk/client-bedrock-runtime');

      const client = new BedrockRuntimeClient({
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
          sessionToken: config.sessionToken,
        },
      });

      // Format depends on the model provider within Bedrock
      const modelId = options.model;
      const requestBody = this.buildRequestBody(modelId, messages, options);

      const command = new InvokeModelCommand({
        modelId,
        body: JSON.stringify(requestBody),
        contentType: 'application/json',
        accept: 'application/json',
      });

      const response = await client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Parse response based on model type
      const { content, inputTokens, outputTokens, finishReason } = this.parseResponse(
        modelId,
        responseBody
      );

      return this.createResponse(
        content,
        { inputTokens, outputTokens },
        modelId,
        finishReason,
        startTime
      );
    } catch (error) {
      throw new LLMError(
        `AWS Bedrock API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        options.model,
        error
      );
    }
  }

  /**
   * Build request body based on model type
   */
  private buildRequestBody(
    modelId: string,
    messages: LLMMessage[],
    options: LLMOptions
  ): Record<string, unknown> {
    if (modelId.startsWith('anthropic.')) {
      // Anthropic Claude models on Bedrock
      const systemMessage = messages.find((m) => m.role === 'system');
      const nonSystemMessages = messages.filter((m) => m.role !== 'system');

      return {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.1,
        system: systemMessage?.content,
        messages: nonSystemMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };
    } else if (modelId.startsWith('meta.')) {
      // Meta Llama models on Bedrock
      const prompt = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
      return {
        prompt,
        max_gen_len: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.1,
      };
    } else if (modelId.startsWith('amazon.')) {
      // Amazon Titan models
      const prompt = messages.map((m) => m.content).join('\n');
      return {
        inputText: prompt,
        textGenerationConfig: {
          maxTokenCount: options.maxTokens ?? 4096,
          temperature: options.temperature ?? 0.1,
        },
      };
    } else {
      // Default format
      return {
        prompt: messages.map((m) => m.content).join('\n'),
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.1,
      };
    }
  }

  /**
   * Parse response based on model type
   */
  private parseResponse(
    modelId: string,
    responseBody: Record<string, unknown>
  ): {
    content: string;
    inputTokens: number;
    outputTokens: number;
    finishReason: string;
  } {
    if (modelId.startsWith('anthropic.')) {
      const anthropicContent = responseBody.content as Array<{ text?: string }> | undefined;
      const anthropicUsage = responseBody.usage as { input_tokens?: number; output_tokens?: number } | undefined;
      return {
        content: anthropicContent?.[0]?.text ?? '',
        inputTokens: anthropicUsage?.input_tokens ?? 0,
        outputTokens: anthropicUsage?.output_tokens ?? 0,
        finishReason: (responseBody.stop_reason as string) ?? 'stop',
      };
    } else if (modelId.startsWith('meta.')) {
      return {
        content: (responseBody.generation as string) ?? '',
        inputTokens: (responseBody.prompt_token_count as number) ?? 0,
        outputTokens: (responseBody.generation_token_count as number) ?? 0,
        finishReason: 'stop',
      };
    } else if (modelId.startsWith('amazon.')) {
      const results = responseBody.results as Array<{ outputText?: string; tokenCount?: number }> | undefined;
      return {
        content: results?.[0]?.outputText ?? '',
        inputTokens: (responseBody.inputTextTokenCount as number) ?? 0,
        outputTokens: results?.[0]?.tokenCount ?? 0,
        finishReason: 'stop',
      };
    } else {
      return {
        content: (responseBody.completion as string) ?? (responseBody.output as string) ?? '',
        inputTokens: 0,
        outputTokens: 0,
        finishReason: 'stop',
      };
    }
  }
}

// Register provider
providerRegistry.register('bedrock', (config) => new BedrockProvider(config));
