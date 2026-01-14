/**
 * Reasoning-Based Verification Method
 * Uses LLM chain-of-thought reasoning for verification
 *
 * FPR: ~7% (research-backed from arxiv:2512.15068)
 * Latency: 2-3s
 * Best for: General verification, logical analysis
 */

import { LLMClient } from '@/lib/llm/client';
import { ProviderKeys, LLMProvider, calculateCostCents } from '@/lib/llm/types';
import { ParadigmExecutor, ParadigmResult, ParadigmOptions } from '../types';
import {
  REASONING_SYSTEM_PROMPT,
  REASONING_USER_PROMPT,
  parseVerificationResponse,
} from '../prompts';
import {
  getDefaultModel,
  selectBestProvider,
  createParadigmErrorResult,
  REASONING_PROVIDER_PREFERENCE,
} from './shared';

// =============================================================================
// REASONING PARADIGM EXECUTOR
// =============================================================================

export class ReasoningParadigm implements ParadigmExecutor {
  name = 'reasoning' as const;
  private llmClient: LLMClient;

  constructor(keys: ProviderKeys) {
    this.llmClient = new LLMClient(keys);
  }

  async execute(
    content: string,
    context: Record<string, unknown>,
    options: ParadigmOptions
  ): Promise<ParadigmResult> {
    const startTime = Date.now();

    // Determine provider and model using shared utilities
    const provider: LLMProvider = options.provider || selectBestProvider(this.llmClient, REASONING_PROVIDER_PREFERENCE);
    const model = options.model || getDefaultModel(provider);

    try {
      const response = await this.llmClient.complete(
        provider,
        [
          { role: 'system', content: REASONING_SYSTEM_PROMPT },
          { role: 'user', content: REASONING_USER_PROMPT(content, context) },
        ],
        {
          model,
          temperature: 0.1, // Low temperature for consistent reasoning
          maxTokens: 1024,
          timeout: options.timeout || 30000,
        }
      );

      const parsed = parseVerificationResponse(response.content);
      const costCents = calculateCostCents(
        model,
        response.usage.inputTokens,
        response.usage.outputTokens
      );

      return {
        paradigm: 'reasoning',
        weight: options.weight,
        provider,
        model: response.model,
        verdict: parsed.verdict,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        processingTimeMs: Date.now() - startTime,
        costCents,
        tokenUsage: {
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
        },
      };
    } catch (error) {
      return createParadigmErrorResult(
        'reasoning',
        options.weight,
        provider,
        model,
        Date.now() - startTime,
        error
      );
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createReasoningParadigm(keys: ProviderKeys): ReasoningParadigm {
  return new ReasoningParadigm(keys);
}
