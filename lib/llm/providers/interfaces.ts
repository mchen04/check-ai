/**
 * LLM Provider Interfaces
 * Strategy pattern interfaces for provider implementations
 */

import { LLMMessage, LLMOptions, LLMResponse, LLMProvider, ExtendedProviderKeys } from '../types';

// =============================================================================
// PROVIDER INTERFACE
// =============================================================================

/**
 * Interface that all LLM providers must implement
 */
export interface ILLMProvider {
  /** Provider identifier */
  readonly name: LLMProvider;

  /** Provider tier (1-4) */
  readonly tier: 1 | 2 | 3 | 4;

  /** Whether this provider uses OpenAI-compatible API */
  readonly isOpenAICompatible: boolean;

  /**
   * Check if this provider is configured with valid credentials
   */
  isConfigured(): boolean;

  /**
   * Generate a completion
   */
  complete(
    messages: LLMMessage[],
    options: LLMOptions & { model: string }
  ): Promise<LLMResponse>;

  /**
   * Get the default model for this provider
   */
  getDefaultModel(): string;
}

// =============================================================================
// PROVIDER CONFIG
// =============================================================================

/**
 * Configuration passed to provider factory functions
 */
export interface ProviderFactoryConfig {
  keys: ExtendedProviderKeys;
}

/**
 * Factory function type for creating providers
 */
export type ProviderFactory = (config: ProviderFactoryConfig) => ILLMProvider;

// =============================================================================
// BASE PROVIDER CLASS
// =============================================================================

/**
 * Abstract base class with shared functionality
 */
export abstract class BaseLLMProvider implements ILLMProvider {
  abstract readonly name: LLMProvider;
  abstract readonly tier: 1 | 2 | 3 | 4;
  abstract readonly isOpenAICompatible: boolean;

  protected keys: ExtendedProviderKeys;

  constructor(config: ProviderFactoryConfig) {
    this.keys = config.keys;
  }

  abstract isConfigured(): boolean;
  abstract complete(
    messages: LLMMessage[],
    options: LLMOptions & { model: string }
  ): Promise<LLMResponse>;
  abstract getDefaultModel(): string;

  /**
   * Helper to create a standardized response
   */
  protected createResponse(
    content: string,
    usage: { inputTokens: number; outputTokens: number },
    model: string,
    finishReason: string,
    startTime: number
  ): LLMResponse {
    return {
      content,
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.inputTokens + usage.outputTokens,
      },
      model,
      provider: this.name,
      finishReason,
      latencyMs: Date.now() - startTime,
    };
  }
}

// =============================================================================
// ERROR CLASS
// =============================================================================

/**
 * Custom error class for LLM operations
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly provider: LLMProvider,
    public readonly model: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'LLMError';
  }
}
