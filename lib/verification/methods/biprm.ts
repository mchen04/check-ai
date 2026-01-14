/**
 * Bidirectional Reasoning (BiPRM) Verification Method
 * Uses both forward and backward reasoning for verification
 *
 * FPR: ~10% (bidirectional consistency checking)
 * Latency: 3-5s
 * Best for: Logical claims, mathematical proofs, causal reasoning
 */

import { LLMClient } from '@/lib/llm/client';
import { ProviderKeys, LLMProvider, calculateCostCents } from '@/lib/llm/types';
import { ParadigmExecutor, ParadigmResult, ParadigmOptions } from '../types';
import { BIPRM_SYSTEM_PROMPT, BIPRM_USER_PROMPT } from '../prompts';
import {
  getDefaultModel,
  selectBestProvider,
  createParadigmErrorResult,
  normalizeVerdict,
  normalizeConfidence,
  extractJsonFromResponse,
  REASONING_PROVIDER_PREFERENCE,
} from './shared';

// =============================================================================
// BIPRM RESPONSE PARSING
// =============================================================================

interface BiPRMResponse {
  verdict: 'true' | 'false' | 'uncertain';
  confidence: number;
  forwardAnalysis: string;
  backwardAnalysis: string;
  reasoning: string;
}

const DEFAULT_BIPRM_RESPONSE: BiPRMResponse = {
  verdict: 'uncertain',
  confidence: 0.5,
  forwardAnalysis: 'Failed to parse response',
  backwardAnalysis: 'Failed to parse response',
  reasoning: 'No reasoning provided',
};

function parseBiPRMResponse(response: string): BiPRMResponse {
  const parsed = extractJsonFromResponse<Record<string, unknown>>(response, {});

  if (Object.keys(parsed).length === 0) {
    return { ...DEFAULT_BIPRM_RESPONSE, reasoning: response.slice(0, 500) };
  }

  return {
    verdict: normalizeVerdict(parsed.verdict),
    confidence: normalizeConfidence(parsed.confidence),
    forwardAnalysis: String(parsed.forward_analysis || parsed.forwardAnalysis || 'No forward analysis'),
    backwardAnalysis: String(parsed.backward_analysis || parsed.backwardAnalysis || 'No backward analysis'),
    reasoning: String(parsed.reasoning || 'No reasoning provided'),
  };
}

// =============================================================================
// BIPRM PARADIGM EXECUTOR
// =============================================================================

export class BiPRMParadigm implements ParadigmExecutor {
  name = 'biprm' as const;
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

    // Use shared utilities for provider and model selection
    const provider: LLMProvider = options.provider || selectBestProvider(this.llmClient, REASONING_PROVIDER_PREFERENCE);
    const model = options.model || getDefaultModel(provider);

    try {
      const response = await this.llmClient.complete(
        provider,
        [
          { role: 'system', content: BIPRM_SYSTEM_PROMPT },
          { role: 'user', content: BIPRM_USER_PROMPT(content, context) },
        ],
        {
          model,
          temperature: 0.2, // Slightly higher for diverse reasoning paths
          maxTokens: 2048, // More tokens for bidirectional analysis
          timeout: options.timeout || 45000,
        }
      );

      const parsed = parseBiPRMResponse(response.content);
      const costCents = calculateCostCents(
        model,
        response.usage.inputTokens,
        response.usage.outputTokens
      );

      // Combine forward and backward analysis in reasoning
      const combinedReasoning = `
FORWARD ANALYSIS:
${parsed.forwardAnalysis}

BACKWARD ANALYSIS:
${parsed.backwardAnalysis}

CONCLUSION:
${parsed.reasoning}
            `.trim();

      return {
        paradigm: 'biprm',
        weight: options.weight,
        provider,
        model: response.model,
        verdict: parsed.verdict,
        confidence: parsed.confidence,
        reasoning: combinedReasoning,
        processingTimeMs: Date.now() - startTime,
        costCents,
        tokenUsage: {
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
        },
      };
    } catch (error) {
      return createParadigmErrorResult(
        'biprm',
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

export function createBiPRMParadigm(keys: ProviderKeys): BiPRMParadigm {
  return new BiPRMParadigm(keys);
}
