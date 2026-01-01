/**
 * Unified LLM Client
 * Provides a consistent interface for calling multiple LLM providers
 * Uses OpenAI SDK format with provider-specific handling
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import {
    LLMMessage,
    LLMOptions,
    LLMResponse,
    LLMProvider,
    ProviderKeys,
    DEFAULT_MODELS,
    calculateCostCents,
} from './types';

// =============================================================================
// LLM CLIENT CLASS
// =============================================================================

export class LLMClient {
    private providerKeys: ProviderKeys;
    private openaiClient?: OpenAI;
    private anthropicClient?: Anthropic;

    constructor(keys: ProviderKeys) {
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
        const startTime = Date.now();
        const model = options.model || DEFAULT_MODELS[provider];

        try {
            switch (provider) {
                case 'openai':
                    return await this.completeOpenAI(messages, { ...options, model });
                case 'anthropic':
                    return await this.completeAnthropic(messages, { ...options, model });
                case 'google':
                    return await this.completeGoogle(messages, { ...options, model });
                case 'deepseek':
                    return await this.completeDeepSeek(messages, { ...options, model });
                case 'groq':
                    return await this.completeGroq(messages, { ...options, model });
                case 'together':
                    return await this.completeTogether(messages, { ...options, model });
                case 'mistral':
                    return await this.completeMistral(messages, { ...options, model });
                default:
                    // Fall back to OpenAI-compatible API
                    return await this.completeOpenAICompatible(
                        provider,
                        messages,
                        { ...options, model }
                    );
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

    /**
     * OpenAI completion
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
     * Anthropic completion
     */
    private async completeAnthropic(
        messages: LLMMessage[],
        options: LLMOptions & { model: string }
    ): Promise<LLMResponse> {
        if (!this.anthropicClient) {
            throw new Error('Anthropic API key not configured');
        }

        const startTime = Date.now();

        // Extract system message
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

        const content =
            response.content[0]?.type === 'text' ? response.content[0].text : '';

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
     * Google (Gemini) completion via OpenAI-compatible API
     */
    private async completeGoogle(
        messages: LLMMessage[],
        options: LLMOptions & { model: string }
    ): Promise<LLMResponse> {
        const apiKey = this.providerKeys.google;
        if (!apiKey) {
            throw new Error('Google API key not configured');
        }

        return this.completeOpenAICompatible('google', messages, options, {
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
            apiKey,
        });
    }

    /**
     * DeepSeek completion via OpenAI-compatible API
     */
    private async completeDeepSeek(
        messages: LLMMessage[],
        options: LLMOptions & { model: string }
    ): Promise<LLMResponse> {
        const apiKey = this.providerKeys.deepseek;
        if (!apiKey) {
            throw new Error('DeepSeek API key not configured');
        }

        return this.completeOpenAICompatible('deepseek', messages, options, {
            baseUrl: 'https://api.deepseek.com/v1',
            apiKey,
        });
    }

    /**
     * Groq completion via OpenAI-compatible API
     */
    private async completeGroq(
        messages: LLMMessage[],
        options: LLMOptions & { model: string }
    ): Promise<LLMResponse> {
        const apiKey = this.providerKeys.groq;
        if (!apiKey) {
            throw new Error('Groq API key not configured');
        }

        return this.completeOpenAICompatible('groq', messages, options, {
            baseUrl: 'https://api.groq.com/openai/v1',
            apiKey,
        });
    }

    /**
     * Together AI completion via OpenAI-compatible API
     */
    private async completeTogether(
        messages: LLMMessage[],
        options: LLMOptions & { model: string }
    ): Promise<LLMResponse> {
        const apiKey = this.providerKeys.together;
        if (!apiKey) {
            throw new Error('Together AI API key not configured');
        }

        return this.completeOpenAICompatible('together', messages, options, {
            baseUrl: 'https://api.together.xyz/v1',
            apiKey,
        });
    }

    /**
     * Mistral completion via OpenAI-compatible API
     */
    private async completeMistral(
        messages: LLMMessage[],
        options: LLMOptions & { model: string }
    ): Promise<LLMResponse> {
        const apiKey = this.providerKeys.mistral;
        if (!apiKey) {
            throw new Error('Mistral API key not configured');
        }

        return this.completeOpenAICompatible('mistral', messages, options, {
            baseUrl: 'https://api.mistral.ai/v1',
            apiKey,
        });
    }

    /**
     * Generic OpenAI-compatible API completion
     */
    private async completeOpenAICompatible(
        provider: LLMProvider,
        messages: LLMMessage[],
        options: LLMOptions & { model: string },
        config?: { baseUrl: string; apiKey: string }
    ): Promise<LLMResponse> {
        const startTime = Date.now();

        const client = new OpenAI({
            apiKey: config?.apiKey ?? this.providerKeys.openai ?? '',
            baseURL: config?.baseUrl,
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
     * Check if a provider is available (has API key configured)
     */
    hasProvider(provider: LLMProvider): boolean {
        switch (provider) {
            case 'openai':
                return !!this.providerKeys.openai;
            case 'anthropic':
                return !!this.providerKeys.anthropic;
            case 'google':
                return !!this.providerKeys.google;
            case 'deepseek':
                return !!this.providerKeys.deepseek;
            case 'groq':
                return !!this.providerKeys.groq;
            case 'together':
                return !!this.providerKeys.together;
            case 'mistral':
                return !!this.providerKeys.mistral;
            case 'cohere':
                return !!this.providerKeys.cohere;
            case 'azure':
                return !!this.providerKeys.azure;
            case 'bedrock':
                return !!this.providerKeys.bedrock;
            default:
                return false;
        }
    }

    /**
     * Get list of available providers
     */
    getAvailableProviders(): LLMProvider[] {
        const providers: LLMProvider[] = [
            'openai',
            'anthropic',
            'google',
            'deepseek',
            'groq',
            'together',
            'mistral',
            'cohere',
            'azure',
            'bedrock',
        ];
        return providers.filter((p) => this.hasProvider(p));
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
// FACTORY FUNCTION
// =============================================================================

/**
 * Create an LLM client with the provided API keys
 */
export function createLLMClient(keys: ProviderKeys): LLMClient {
    return new LLMClient(keys);
}

/**
 * Create an LLM client from environment variables
 */
export function createLLMClientFromEnv(): LLMClient {
    return new LLMClient({
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        google: process.env.GOOGLE_API_KEY,
        deepseek: process.env.DEEPSEEK_API_KEY,
        groq: process.env.GROQ_API_KEY,
        together: process.env.TOGETHER_API_KEY,
        mistral: process.env.MISTRAL_API_KEY,
        cohere: process.env.COHERE_API_KEY,
        azure: process.env.AZURE_OPENAI_API_KEY,
        bedrock: process.env.AWS_ACCESS_KEY_ID, // Bedrock uses AWS credentials
    });
}
