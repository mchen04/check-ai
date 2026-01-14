/**
 * Shared Utilities for Verification Paradigms
 * Centralizes common functionality to eliminate code duplication
 */

import { LLMClient } from '@/lib/llm/client';
import { LLMProvider } from '@/lib/llm/types';
import { ParadigmResult, ParadigmType } from '../types';

// =============================================================================
// DEFAULT MODELS BY PROVIDER
// =============================================================================

/**
 * Default model mappings for each LLM provider
 * Centralized to avoid duplication across paradigm executors
 */
export const DEFAULT_PARADIGM_MODELS: Record<LLMProvider, string> = {
  // Tier 1: First-party providers
  openai: 'gpt-4.1',
  anthropic: 'claude-sonnet-4-5-20250929',
  google: 'gemini-2.5-flash',
  xai: 'grok-4',
  mistral: 'mistral-large-latest',
  cohere: 'command-r-plus',
  deepseek: 'deepseek-chat',
  // Tier 2: Cloud providers
  azure: 'gpt-4o',
  bedrock: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  // Tier 3: Inference providers
  groq: 'llama-3.3-70b-versatile',
  together: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  fireworks: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
  cerebras: 'llama3.3-70b',
  perplexity: 'sonar-pro',
  // Tier 4: Gateways
  openrouter: 'anthropic/claude-3.5-sonnet',
  // Legacy
  replicate: 'meta/llama-2-70b-chat',
};

/**
 * Get the default model for a provider
 */
export function getDefaultModel(provider: LLMProvider): string {
  return DEFAULT_PARADIGM_MODELS[provider] || 'gpt-4.1';
}

// =============================================================================
// PROVIDER SELECTION
// =============================================================================

/**
 * Provider preference order for reasoning-heavy paradigms
 * Anthropic and OpenAI excel at chain-of-thought reasoning
 */
export const REASONING_PROVIDER_PREFERENCE: LLMProvider[] = [
  'anthropic',
  'openai',
  'google',
  'deepseek',
  'groq',
];

/**
 * Select the best available provider based on preference order
 */
export function selectBestProvider(
  llmClient: LLMClient,
  preferenceOrder: LLMProvider[] = REASONING_PROVIDER_PREFERENCE
): LLMProvider {
  for (const provider of preferenceOrder) {
    if (llmClient.hasProvider(provider)) {
      return provider;
    }
  }
  return 'openai'; // Default fallback
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
