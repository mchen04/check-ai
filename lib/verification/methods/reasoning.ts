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

    // Determine provider and model
    const provider: LLMProvider = options.provider || this.selectBestProvider();
    const model = options.model || this.getDefaultModel(provider);

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
      return {
        paradigm: 'reasoning',
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
    // Prefer providers in order of quality for reasoning tasks
    const preferredOrder: LLMProvider[] = [
      'anthropic', // Claude excels at reasoning
      'openai',
      'google',
      'deepseek',
      'groq',
    ];

    for (const provider of preferredOrder) {
      if (this.llmClient.hasProvider(provider)) {
        return provider;
      }
    }

    return 'openai'; // Default fallback
  }

  private getDefaultModel(provider: LLMProvider): string {
    const models: Record<LLMProvider, string> = {
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
    return models[provider] || 'gpt-4o';
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createReasoningParadigm(keys: ProviderKeys): ReasoningParadigm {
  return new ReasoningParadigm(keys);
}
