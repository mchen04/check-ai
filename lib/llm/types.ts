/**
 * LLM Types and Interfaces
 * Unified types for multi-provider LLM interactions
 */

// =============================================================================
// PROVIDER TYPES
// =============================================================================

export type LLMProvider =
    | 'openai'
    | 'anthropic'
    | 'google'
    | 'deepseek'
    | 'groq'
    | 'together'
    | 'mistral'
    | 'cohere'
    | 'replicate'
    | 'azure'
    | 'bedrock';

// =============================================================================
// MESSAGE TYPES (OpenAI-compatible format)
// =============================================================================

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LLMOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    timeout?: number;
    stream?: boolean;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface LLMUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}

export interface LLMResponse {
    content: string;
    usage: LLMUsage;
    model: string;
    provider: LLMProvider;
    finishReason: string;
    latencyMs: number;
}

// =============================================================================
// PROVIDER CONFIGURATION
// =============================================================================

export interface ProviderConfig {
    provider: LLMProvider;
    apiKey: string;
    baseUrl?: string;
    defaultModel?: string;
    organizationId?: string;
}

export interface ProviderKeys {
    openai?: string;
    anthropic?: string;
    google?: string;
    deepseek?: string;
    groq?: string;
    together?: string;
    mistral?: string;
    cohere?: string;
    azure?: string;
    bedrock?: string;
}

// =============================================================================
// MODEL PRICING (cost per 1M tokens in USD)
// =============================================================================

export interface ModelPricing {
    inputPer1M: number;
    outputPer1M: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
    // OpenAI
    'gpt-4o': { inputPer1M: 2.50, outputPer1M: 10.00 },
    'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.60 },
    'gpt-4-turbo': { inputPer1M: 10.00, outputPer1M: 30.00 },
    'gpt-4': { inputPer1M: 30.00, outputPer1M: 60.00 },
    'gpt-3.5-turbo': { inputPer1M: 0.50, outputPer1M: 1.50 },
    'o1': { inputPer1M: 15.00, outputPer1M: 60.00 },
    'o1-mini': { inputPer1M: 3.00, outputPer1M: 12.00 },
    'o3-mini': { inputPer1M: 1.10, outputPer1M: 4.40 },

    // Anthropic
    'claude-3-opus-20240229': { inputPer1M: 15.00, outputPer1M: 75.00 },
    'claude-3-5-sonnet-20241022': { inputPer1M: 3.00, outputPer1M: 15.00 },
    'claude-3-5-haiku-20241022': { inputPer1M: 0.80, outputPer1M: 4.00 },
    'claude-3-sonnet-20240229': { inputPer1M: 3.00, outputPer1M: 15.00 },
    'claude-3-haiku-20240307': { inputPer1M: 0.25, outputPer1M: 1.25 },

    // Google
    'gemini-2.0-flash': { inputPer1M: 0.10, outputPer1M: 0.40 },
    'gemini-1.5-pro': { inputPer1M: 1.25, outputPer1M: 5.00 },
    'gemini-1.5-flash': { inputPer1M: 0.075, outputPer1M: 0.30 },

    // DeepSeek
    'deepseek-chat': { inputPer1M: 0.14, outputPer1M: 0.28 },
    'deepseek-coder': { inputPer1M: 0.14, outputPer1M: 0.28 },
    'deepseek-reasoner': { inputPer1M: 0.55, outputPer1M: 2.19 },

    // Groq
    'llama-3.3-70b-versatile': { inputPer1M: 0.59, outputPer1M: 0.79 },
    'llama-3.1-8b-instant': { inputPer1M: 0.05, outputPer1M: 0.08 },
    'mixtral-8x7b-32768': { inputPer1M: 0.24, outputPer1M: 0.24 },

    // Together AI
    'meta-llama/Llama-3.3-70B-Instruct-Turbo': { inputPer1M: 0.88, outputPer1M: 0.88 },
    'mistralai/Mixtral-8x22B-Instruct-v0.1': { inputPer1M: 1.20, outputPer1M: 1.20 },

    // Mistral
    'mistral-large-latest': { inputPer1M: 2.00, outputPer1M: 6.00 },
    'mistral-small-latest': { inputPer1M: 0.20, outputPer1M: 0.60 },
};

// =============================================================================
// DEFAULT MODELS PER PROVIDER
// =============================================================================

export const DEFAULT_MODELS: Record<LLMProvider, string> = {
    openai: 'gpt-4o',
    anthropic: 'claude-3-5-sonnet-20241022',
    google: 'gemini-2.0-flash',
    deepseek: 'deepseek-chat',
    groq: 'llama-3.3-70b-versatile',
    together: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    mistral: 'mistral-large-latest',
    cohere: 'command-r-plus',
    replicate: 'meta/llama-2-70b-chat',
    azure: 'gpt-4o',
    bedrock: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
};

// =============================================================================
// LITELLM MODEL PREFIXES
// =============================================================================

export const LITELLM_PREFIXES: Record<LLMProvider, string> = {
    openai: 'openai/',
    anthropic: 'anthropic/',
    google: 'gemini/',
    deepseek: 'deepseek/',
    groq: 'groq/',
    together: 'together_ai/',
    mistral: 'mistral/',
    cohere: 'cohere/',
    replicate: 'replicate/',
    azure: 'azure/',
    bedrock: 'bedrock/',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate cost in cents for a given model and token usage
 */
export function calculateCostCents(
    model: string,
    inputTokens: number,
    outputTokens: number
): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) {
        // Default to gpt-4o pricing if model not found
        const defaultPricing = MODEL_PRICING['gpt-4o'];
        const inputCost = (inputTokens / 1_000_000) * defaultPricing.inputPer1M;
        const outputCost = (outputTokens / 1_000_000) * defaultPricing.outputPer1M;
        return Math.ceil((inputCost + outputCost) * 100);
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
    return Math.ceil((inputCost + outputCost) * 100); // Convert to cents
}

/**
 * Get the LiteLLM model string for a provider and model
 */
export function getLiteLLMModel(provider: LLMProvider, model: string): string {
    const prefix = LITELLM_PREFIXES[provider];
    if (!prefix) {
        return model;
    }
    // Don't double-prefix if already prefixed
    if (model.startsWith(prefix)) {
        return model;
    }
    return `${prefix}${model}`;
}

/**
 * Extract provider from a LiteLLM model string
 */
export function getProviderFromModel(litellmModel: string): LLMProvider {
    for (const [provider, prefix] of Object.entries(LITELLM_PREFIXES)) {
        if (litellmModel.startsWith(prefix)) {
            return provider as LLMProvider;
        }
    }
    return 'openai'; // Default
}
