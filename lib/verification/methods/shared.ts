/**
 * Shared Utilities for Verification Paradigms
 * Centralizes common functionality to eliminate code duplication
 */

import { LLMClient, LLMProvider } from '@/lib/llm';
import { getDefaultModel as configGetDefaultModel } from '@/lib/llm/config';
import type { ModelCapability } from '@/lib/llm/model-registry';
import { ParadigmResult, ParadigmType } from '../types';

// =============================================================================
// DEFAULT MODELS BY PROVIDER
// =============================================================================

/**
 * Get the default model for a provider — delegates to centralized config
 */
export function getDefaultModel(provider: LLMProvider): string {
  return configGetDefaultModel(provider);
}

// =============================================================================
// PROVIDER SELECTION
// =============================================================================

/**
 * Provider preference order for reasoning-heavy paradigms
 * Anthropic and OpenAI excel at chain-of-thought reasoning
 * OpenRouter is last because it's a gateway — prefer direct providers first
 */
export const REASONING_PROVIDER_PREFERENCE: LLMProvider[] = [
  'anthropic',
  'openai',
  'google',
  'deepseek',
  'groq',
  'together',
  'fireworks',
  'cerebras',
  'mistral',
  'cohere',
  'xai',
  'perplexity',
  'azure',
  'bedrock',
  'openrouter',
];

/**
 * Provider preference order for embedding-capable providers
 */
export const EMBEDDING_PROVIDER_PREFERENCE: LLMProvider[] = [
  'openai',
  'google',
  'cohere',
  'mistral',
];

/**
 * Select the best available provider based on preference order.
 * Optionally filter by required capabilities.
 */
export function selectBestProvider(
  llmClient: LLMClient,
  preferenceOrder: LLMProvider[] = REASONING_PROVIDER_PREFERENCE,
  requiredCapabilities?: ModelCapability[]
): LLMProvider {
  for (const provider of preferenceOrder) {
    if (!llmClient.hasProvider(provider)) continue;

    // If capability filtering requested, check via client
    if (requiredCapabilities && requiredCapabilities.length > 0) {
      const hasAll = requiredCapabilities.every(
        (cap) => llmClient.findProviderWithCapability(cap, [provider]) === provider
      );
      if (!hasAll) continue;
    }

    return provider;
  }
  // Final fallback: check openrouter explicitly (most common BYOK setup)
  if (llmClient.hasProvider('openrouter')) {
    return 'openrouter';
  }
  return 'openai';
}

/**
 * Select the best available embedding provider
 */
export function selectBestEmbeddingProvider(
  llmClient: LLMClient
): LLMProvider | null {
  for (const provider of EMBEDDING_PROVIDER_PREFERENCE) {
    if (llmClient.hasProvider(provider)) {
      return provider;
    }
  }
  return null;
}

// =============================================================================
// ERROR RESULT FACTORY
// =============================================================================

/**
 * Create a standardized error result for failed paradigm execution
 * Ensures consistent error handling across all paradigms
 */
export function createParadigmErrorResult(
  paradigm: ParadigmType,
  weight: number,
  provider: LLMProvider,
  model: string,
  processingTimeMs: number,
  error: unknown
): ParadigmResult {
  return {
    paradigm,
    weight,
    provider,
    model,
    verdict: null,
    confidence: 0,
    reasoning: null,
    processingTimeMs,
    costCents: 0,
    error: error instanceof Error ? error.message : 'Unknown error',
  };
}

// =============================================================================
// RESPONSE PARSING UTILITIES
// =============================================================================

/**
 * Normalize a verdict string to the standard Verdict type
 */
export function normalizeVerdict(
  value: unknown
): 'true' | 'false' | 'uncertain' {
  if (!value) return 'uncertain';

  const v = String(value).toLowerCase();
  if (v === 'true' || v === 'yes' || v === 'accurate' || v === 'correct') {
    return 'true';
  }
  if (v === 'false' || v === 'no' || v === 'inaccurate' || v === 'incorrect') {
    return 'false';
  }
  return 'uncertain';
}

/**
 * Normalize a confidence value to 0-1 range
 */
export function normalizeConfidence(value: unknown): number {
  if (typeof value !== 'number') return 0.5;
  return Math.max(0, Math.min(1, value));
}

/**
 * Safely extract JSON from a response that may contain other text
 */
export function extractJsonFromResponse<T>(
  response: string,
  fallback: T
): T {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallback;
    }
    return JSON.parse(jsonMatch[0]) as T;
  } catch {
    return fallback;
  }
}
