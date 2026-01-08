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

function parseBiPRMResponse(response: string): BiPRMResponse {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Normalize verdict
    let verdict: 'true' | 'false' | 'uncertain' = 'uncertain';
    if (parsed.verdict) {
      const v = parsed.verdict.toString().toLowerCase();
      if (v === 'true' || v === 'yes' || v === 'accurate' || v === 'correct') {
        verdict = 'true';
      } else if (v === 'false' || v === 'no' || v === 'inaccurate' || v === 'incorrect') {
        verdict = 'false';
      }
    }

    // Normalize confidence
    let confidence = 0.5;
    if (typeof parsed.confidence === 'number') {
      confidence = Math.max(0, Math.min(1, parsed.confidence));
    }

    return {
      verdict,
      confidence,
      forwardAnalysis: parsed.forward_analysis || parsed.forwardAnalysis || 'No forward analysis',
      backwardAnalysis:
        parsed.backward_analysis || parsed.backwardAnalysis || 'No backward analysis',
      reasoning: parsed.reasoning || 'No reasoning provided',
    };
  } catch {
    return {
      verdict: 'uncertain',
      confidence: 0.5,
      forwardAnalysis: 'Failed to parse response',
      backwardAnalysis: 'Failed to parse response',
      reasoning: response.slice(0, 500),
    };
  }
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

    const provider: LLMProvider = options.provider || this.selectBestProvider();
    const model = options.model || this.getDefaultModel(provider);

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
      return {
        paradigm: 'biprm',
        weight: options.weight,
        provider,
        model,
        verdict: null,
        confidence: 0,
        reasoning: null,
        processingTimeMs: Date.now() - startTime,
        costCents: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private selectBestProvider(): LLMProvider {
    // BiPRM benefits from strong reasoning models
    const preferredOrder: LLMProvider[] = [
      'anthropic', // Claude excellent at reasoning
      'openai', // GPT-4 good at logical analysis
      'deepseek', // DeepSeek strong at reasoning
      'google',
      'groq',
    ];

    for (const provider of preferredOrder) {
      if (this.llmClient.hasProvider(provider)) {
        return provider;
      }
    }

    return 'openai';
  }

  private getDefaultModel(provider: LLMProvider): string {
    // Use more capable models for BiPRM
    const models: Record<LLMProvider, string> = {
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
    return models[provider] || 'gpt-4.1';
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createBiPRMParadigm(keys: ProviderKeys): BiPRMParadigm {
  return new BiPRMParadigm(keys);
}
