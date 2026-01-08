/**
 * Unified LLM Client
 * Provides a consistent interface for calling 16+ LLM providers
 * Supports BYOK (Bring Your Own Key) with OpenAI-compatible APIs
 *
 * Provider Tiers:
 * - Tier 1: First-party (OpenAI, Anthropic, Google, xAI, Mistral, Cohere, DeepSeek)
 * - Tier 2: Cloud (Azure OpenAI, AWS Bedrock)
 * - Tier 3: Inference (Groq, Together, Fireworks, Cerebras, Perplexity)
 * - Tier 4: Gateways (OpenRouter)
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import {
  LLMMessage,
  LLMOptions,
  LLMResponse,
  LLMProvider,
  ProviderKeys,
  ExtendedProviderKeys,
  AzureOpenAIConfig,
  BedrockConfig,
  DEFAULT_MODELS,
  PROVIDER_BASE_URLS,
} from './types';

// =============================================================================
// LLM CLIENT CLASS
// =============================================================================

export class LLMClient {
  private providerKeys: ExtendedProviderKeys;
  private openaiClient?: OpenAI;
  private anthropicClient?: Anthropic;

  constructor(keys: ExtendedProviderKeys) {
    this.providerKeys = keys;

    // Initialize OpenAI client if key provided
    if (keys.openai) {
      this.openaiClient = new OpenAI({ apiKey: keys.openai });
    }

    // Initialize Anthropic client if key provided
    if (keys.anthropic) {
      this.anthropicClient = new Anthropic({ apiKey: keys.anthropic });
    }
  }

  /**
   * Generate a completion using the specified provider and model
   */
  async complete(
    provider: LLMProvider,
    messages: LLMMessage[],
    options: LLMOptions = {}
  ): Promise<LLMResponse> {
    const model = options.model || DEFAULT_MODELS[provider];

    try {
      switch (provider) {
        // Tier 1: First-party providers
        case 'openai':
          return await this.completeOpenAI(messages, { ...options, model });
        case 'anthropic':
          return await this.completeAnthropic(messages, { ...options, model });
        case 'google':
          return await this.completeOpenAICompatible('google', messages, { ...options, model });
        case 'xai':
          return await this.completeOpenAICompatible('xai', messages, { ...options, model });
        case 'mistral':
          return await this.completeOpenAICompatible('mistral', messages, { ...options, model });
        case 'cohere':
          return await this.completeCohere(messages, { ...options, model });
        case 'deepseek':
          return await this.completeOpenAICompatible('deepseek', messages, { ...options, model });

        // Tier 2: Cloud providers (enterprise)
        case 'azure':
          return await this.completeAzure(messages, { ...options, model });
        case 'bedrock':
          return await this.completeBedrock(messages, { ...options, model });

        // Tier 3: Inference providers
        case 'groq':
          return await this.completeOpenAICompatible('groq', messages, { ...options, model });
        case 'together':
          return await this.completeOpenAICompatible('together', messages, { ...options, model });
        case 'fireworks':
          return await this.completeOpenAICompatible('fireworks', messages, { ...options, model });
        case 'cerebras':
          return await this.completeOpenAICompatible('cerebras', messages, { ...options, model });
        case 'perplexity':
          return await this.completeOpenAICompatible('perplexity', messages, { ...options, model });

        // Tier 4: Unified gateways
        case 'openrouter':
          return await this.completeOpenRouter(messages, { ...options, model });

        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      throw new LLMError(
        `Failed to complete with ${provider}/${model}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider,
        model,
        error
      );
    }
  }

  // ===========================================================================
  // TIER 1: FIRST-PARTY PROVIDERS
  // ===========================================================================

  /**
   * OpenAI completion (native SDK)
   */
  private async completeOpenAI(
    messages: LLMMessage[],
    options: LLMOptions & { model: string }
  ): Promise<LLMResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI API key not configured');
    }

    const startTime = Date.now();
    const response = await this.openaiClient.chat.completions.create({
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

    const usage = {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
    };

    return {
      content: response.choices[0]?.message?.content ?? '',
      usage,
      model: response.model,
      provider: 'openai',
      finishReason: response.choices[0]?.finish_reason ?? 'stop',
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Anthropic completion (native SDK - different message format)
   */
  private async completeAnthropic(
    messages: LLMMessage[],
    options: LLMOptions & { model: string }
  ): Promise<LLMResponse> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic API key not configured');
    }

    const startTime = Date.now();

    // Anthropic uses a separate system parameter
    const systemMessage = messages.find((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const response = await this.anthropicClient.messages.create({
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

    const usage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    };

    return {
      content,
      usage,
      model: response.model,
      provider: 'anthropic',
      finishReason: response.stop_reason ?? 'end_turn',
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Cohere completion (native API format)
   */
  private async completeCohere(
    messages: LLMMessage[],
    options: LLMOptions & { model: string }
  ): Promise<LLMResponse> {
    const apiKey = this.providerKeys.cohere;
    if (!apiKey) {
      throw new Error('Cohere API key not configured');
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

    return {
      content: data.text ?? '',
      usage: {
        inputTokens: data.meta?.tokens?.input_tokens ?? 0,
        outputTokens: data.meta?.tokens?.output_tokens ?? 0,
        totalTokens: (data.meta?.tokens?.input_tokens ?? 0) + (data.meta?.tokens?.output_tokens ?? 0),
      },
      model: options.model,
      provider: 'cohere',
      finishReason: data.finish_reason ?? 'COMPLETE',
      latencyMs: Date.now() - startTime,
    };
  }

  // ===========================================================================
  // TIER 2: CLOUD PROVIDERS (ENTERPRISE)
  // ===========================================================================

  /**
   * Azure OpenAI completion
   * Requires deployment name instead of model name
   */
  private async completeAzure(
    messages: LLMMessage[],
    options: LLMOptions & { model: string }
  ): Promise<LLMResponse> {
    const config = this.providerKeys.azureConfig;
    if (!config) {
      throw new Error('Azure OpenAI configuration not provided. Requires endpoint, apiKey, and deploymentId.');
    }

    const startTime = Date.now();
    const apiVersion = config.apiVersion ?? '2024-10-21';

    // Azure uses a different endpoint format
    const url = `${config.endpoint}/openai/deployments/${config.deploymentId}/chat/completions?api-version=${apiVersion}`;

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

    return {
      content: data.choices?.[0]?.message?.content ?? '',
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      model: config.deploymentId,
      provider: 'azure',
      finishReason: data.choices?.[0]?.finish_reason ?? 'stop',
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * AWS Bedrock completion
   * Uses AWS SDK authentication
   */
  private async completeBedrock(
    messages: LLMMessage[],
    options: LLMOptions & { model: string }
  ): Promise<LLMResponse> {
    const config = this.providerKeys.bedrockConfig;
    if (!config) {
      throw new Error('AWS Bedrock configuration not provided. Requires accessKeyId, secretAccessKey, and region.');
    }

    const startTime = Date.now();

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
    let requestBody: Record<string, unknown>;

    if (modelId.startsWith('anthropic.')) {
      // Anthropic Claude models on Bedrock
      const systemMessage = messages.find((m) => m.role === 'system');
      const nonSystemMessages = messages.filter((m) => m.role !== 'system');

      requestBody = {
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
      requestBody = {
        prompt,
        max_gen_len: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.1,
      };
    } else if (modelId.startsWith('amazon.')) {
      // Amazon Titan models
      const prompt = messages.map((m) => m.content).join('\n');
      requestBody = {
        inputText: prompt,
        textGenerationConfig: {
          maxTokenCount: options.maxTokens ?? 4096,
          temperature: options.temperature ?? 0.1,
        },
      };
    } else {
      // Default format
      requestBody = {
        prompt: messages.map((m) => m.content).join('\n'),
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.1,
      };
    }

    const command = new InvokeModelCommand({
      modelId,
      body: JSON.stringify(requestBody),
      contentType: 'application/json',
      accept: 'application/json',
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Parse response based on model type
    let content = '';
    let inputTokens = 0;
    let outputTokens = 0;

    if (modelId.startsWith('anthropic.')) {
      content = responseBody.content?.[0]?.text ?? '';
      inputTokens = responseBody.usage?.input_tokens ?? 0;
      outputTokens = responseBody.usage?.output_tokens ?? 0;
    } else if (modelId.startsWith('meta.')) {
      content = responseBody.generation ?? '';
      inputTokens = responseBody.prompt_token_count ?? 0;
      outputTokens = responseBody.generation_token_count ?? 0;
    } else if (modelId.startsWith('amazon.')) {
      content = responseBody.results?.[0]?.outputText ?? '';
      inputTokens = responseBody.inputTextTokenCount ?? 0;
      outputTokens = responseBody.results?.[0]?.tokenCount ?? 0;
    } else {
      content = responseBody.completion ?? responseBody.output ?? '';
    }

    return {
      content,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
      model: modelId,
      provider: 'bedrock',
      finishReason: responseBody.stop_reason ?? 'stop',
      latencyMs: Date.now() - startTime,
    };
  }

  // ===========================================================================
  // TIER 3 & 4: INFERENCE PROVIDERS & GATEWAYS (OpenAI-Compatible)
  // ===========================================================================

  /**
   * Generic OpenAI-compatible API completion
   * Works for: Google, xAI, Mistral, DeepSeek, Groq, Together, Fireworks, Cerebras, Perplexity
   */
  private async completeOpenAICompatible(
    provider: LLMProvider,
    messages: LLMMessage[],
    options: LLMOptions & { model: string }
  ): Promise<LLMResponse> {
    const apiKey = this.providerKeys[provider as keyof ProviderKeys];
    const baseURL = PROVIDER_BASE_URLS[provider];

    if (!apiKey) {
      throw new Error(`${provider} API key not configured`);
    }
    if (!baseURL) {
      throw new Error(`Base URL not configured for provider: ${provider}`);
    }

    const startTime = Date.now();

    const client = new OpenAI({
      apiKey,
      baseURL,
    });

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

    const usage = {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
    };

    return {
      content: response.choices[0]?.message?.content ?? '',
      usage,
      model: response.model || options.model,
      provider,
      finishReason: response.choices[0]?.finish_reason ?? 'stop',
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * OpenRouter completion (unified gateway)
   * Supports additional headers for attribution
   */
  private async completeOpenRouter(
    messages: LLMMessage[],
    options: LLMOptions & { model: string }
  ): Promise<LLMResponse> {
    const apiKey = this.providerKeys.openrouter;
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const startTime = Date.now();

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

    return {
      content: data.choices?.[0]?.message?.content ?? '',
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      model: data.model || options.model,
      provider: 'openrouter',
      finishReason: data.choices?.[0]?.finish_reason ?? 'stop',
      latencyMs: Date.now() - startTime,
    };
  }

  // ===========================================================================
  // PROVIDER AVAILABILITY
  // ===========================================================================

  /**
   * Check if a provider is available (has API key configured)
   */
  hasProvider(provider: LLMProvider): boolean {
    switch (provider) {
      // Tier 1: First-party
      case 'openai':
        return !!this.providerKeys.openai;
      case 'anthropic':
        return !!this.providerKeys.anthropic;
      case 'google':
        return !!this.providerKeys.google;
      case 'xai':
        return !!this.providerKeys.xai;
      case 'mistral':
        return !!this.providerKeys.mistral;
      case 'cohere':
        return !!this.providerKeys.cohere;
      case 'deepseek':
        return !!this.providerKeys.deepseek;
      // Tier 2: Cloud
      case 'azure':
        return !!this.providerKeys.azureConfig;
      case 'bedrock':
        return !!this.providerKeys.bedrockConfig;
      // Tier 3: Inference
      case 'groq':
        return !!this.providerKeys.groq;
      case 'together':
        return !!this.providerKeys.together;
      case 'fireworks':
        return !!this.providerKeys.fireworks;
      case 'cerebras':
        return !!this.providerKeys.cerebras;
      case 'perplexity':
        return !!this.providerKeys.perplexity;
      // Tier 4: Gateways
      case 'openrouter':
        return !!this.providerKeys.openrouter;
      // Legacy
      case 'replicate':
        return !!this.providerKeys.replicate;
      default:
        return false;
    }
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): LLMProvider[] {
    const allProviders: LLMProvider[] = [
      // Tier 1
      'openai',
      'anthropic',
      'google',
      'xai',
      'mistral',
      'cohere',
      'deepseek',
      // Tier 2
      'azure',
      'bedrock',
      // Tier 3
      'groq',
      'together',
      'fireworks',
      'cerebras',
      'perplexity',
      // Tier 4
      'openrouter',
    ];
    return allProviders.filter((p) => this.hasProvider(p));
  }

  /**
   * Get providers by tier
   */
  getProvidersByTier(tier: 1 | 2 | 3 | 4): LLMProvider[] {
    const tiers: Record<number, LLMProvider[]> = {
      1: ['openai', 'anthropic', 'google', 'xai', 'mistral', 'cohere', 'deepseek'],
      2: ['azure', 'bedrock'],
      3: ['groq', 'together', 'fireworks', 'cerebras', 'perplexity'],
      4: ['openrouter'],
    };
    return tiers[tier].filter((p) => this.hasProvider(p));
  }
}

// =============================================================================
// LLM ERROR CLASS
// =============================================================================

export class LLMError extends Error {
  constructor(
    message: string,
    public provider: LLMProvider,
    public model: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create an LLM client with the provided API keys
 */
export function createLLMClient(keys: ExtendedProviderKeys): LLMClient {
  return new LLMClient(keys);
}

/**
 * Create an LLM client from environment variables
 */
export function createLLMClientFromEnv(): LLMClient {
  return new LLMClient({
    // Tier 1: First-party
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GOOGLE_API_KEY,
    xai: process.env.XAI_API_KEY,
    mistral: process.env.MISTRAL_API_KEY,
    cohere: process.env.COHERE_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
    // Tier 2: Cloud (requires config objects for full setup)
    azure: process.env.AZURE_OPENAI_API_KEY,
    bedrock: process.env.AWS_ACCESS_KEY_ID,
    // Azure config from env
    azureConfig: process.env.AZURE_OPENAI_ENDPOINT
      ? {
          apiKey: process.env.AZURE_OPENAI_API_KEY ?? '',
          endpoint: process.env.AZURE_OPENAI_ENDPOINT,
          deploymentId: process.env.AZURE_OPENAI_DEPLOYMENT_ID ?? '',
          apiVersion: process.env.AZURE_OPENAI_API_VERSION,
        }
      : undefined,
    // Bedrock config from env
    bedrockConfig: process.env.AWS_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
          region: process.env.AWS_REGION ?? 'us-east-1',
          sessionToken: process.env.AWS_SESSION_TOKEN,
        }
      : undefined,
    // Tier 3: Inference
    groq: process.env.GROQ_API_KEY,
    together: process.env.TOGETHER_API_KEY,
    fireworks: process.env.FIREWORKS_API_KEY,
    cerebras: process.env.CEREBRAS_API_KEY,
    perplexity: process.env.PERPLEXITY_API_KEY,
    // Tier 4: Gateways
    openrouter: process.env.OPENROUTER_API_KEY,
  });
}
