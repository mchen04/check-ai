/**
 * Ensemble Verification Method
 * Uses multiple models to vote on verification
 *
 * FPR: 20-40% (depends on model diversity)
 * Latency: 5-10s (parallel model calls)
 * Best for: High-stakes decisions, reducing single-model bias
 */

import { LLMClient } from '@/lib/llm/client';
import { ProviderKeys, LLMProvider, calculateCostCents } from '@/lib/llm/types';
import { ParadigmExecutor, ParadigmResult, ParadigmOptions, Verdict } from '../types';
import {
  ENSEMBLE_SYSTEM_PROMPT,
  ENSEMBLE_USER_PROMPT,
  parseVerificationResponse,
} from '../prompts';
import { getDefaultModel, createParadigmErrorResult } from './shared';

// =============================================================================
// ENSEMBLE CONFIGURATION
// =============================================================================

interface EnsembleMember {
  provider: LLMProvider;
  model: string;
  weight: number; // Relative voting weight
}

// Default ensemble configuration (diverse models)
const DEFAULT_ENSEMBLE: EnsembleMember[] = [
  { provider: 'openai', model: 'gpt-4o', weight: 1.0 },
  { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', weight: 1.0 },
  { provider: 'google', model: 'gemini-2.0-flash', weight: 0.8 },
];

// Fallback ensemble if some providers unavailable
const FALLBACK_ENSEMBLE: EnsembleMember[] = [
  { provider: 'openai', model: 'gpt-4o', weight: 1.0 },
  { provider: 'openai', model: 'gpt-4o-mini', weight: 0.7 },
  { provider: 'openai', model: 'gpt-4-turbo', weight: 0.9 },
];

// =============================================================================
// ENSEMBLE PARADIGM EXECUTOR
// =============================================================================

interface MemberResult {
  member: EnsembleMember;
  verdict: Verdict | null;
  confidence: number;
  reasoning: string | null;
  error?: string;
  inputTokens: number;
  outputTokens: number;
  processingTimeMs: number;
}

export class EnsembleParadigm implements ParadigmExecutor {
  name = 'ensemble' as const;
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

    try {
      // Select ensemble members based on available providers
      const ensemble = this.selectEnsemble();

      if (ensemble.length < 2) {
        throw new Error('Ensemble requires at least 2 models');
      }

      // Run all models in parallel
      const memberResults = await Promise.all(
        ensemble.map((member) => this.runMember(member, content, context, options))
      );

      // Aggregate results
      const aggregated = this.aggregateResults(memberResults);

      // Calculate total costs and tokens
      const totalInputTokens = memberResults.reduce((sum, r) => sum + r.inputTokens, 0);
      const totalOutputTokens = memberResults.reduce((sum, r) => sum + r.outputTokens, 0);
      const totalCostCents = memberResults.reduce((sum, r) => {
        return sum + calculateCostCents(r.member.model, r.inputTokens, r.outputTokens);
      }, 0);

      // Generate reasoning summary
      const reasoning = this.formatReasoning(memberResults, aggregated);

      return {
        paradigm: 'ensemble',
        weight: options.weight,
        provider: 'openai', // Primary provider in reporting
        model: `ensemble-${ensemble.length}`,
        verdict: aggregated.verdict,
        confidence: aggregated.confidence,
        reasoning,
        processingTimeMs: Date.now() - startTime,
        costCents: totalCostCents,
        tokenUsage: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
        },
      };
    } catch (error) {
      return createParadigmErrorResult(
        'ensemble',
        options.weight,
        'openai',
        'ensemble',
        Date.now() - startTime,
        error
      );
    }
  }

  private selectEnsemble(): EnsembleMember[] {
    const availableMembers: EnsembleMember[] = [];

    // Check which default ensemble members are available
    for (const member of DEFAULT_ENSEMBLE) {
      if (this.llmClient.hasProvider(member.provider)) {
        availableMembers.push(member);
      }
    }

    // If we have at least 2 diverse models, use them
    if (availableMembers.length >= 2) {
      return availableMembers;
    }

    // Fall back to multiple OpenAI models if that's all we have
    if (this.llmClient.hasProvider('openai')) {
      return FALLBACK_ENSEMBLE;
    }

    // Use whatever is available
    const providers: LLMProvider[] = [
      'anthropic',
      'google',
      'deepseek',
      'groq',
      'together',
      'mistral',
    ];

    for (const provider of providers) {
      if (this.llmClient.hasProvider(provider)) {
        availableMembers.push({
          provider,
          model: getDefaultModel(provider),
          weight: 1.0,
        });
      }
      if (availableMembers.length >= 3) break;
    }

    return availableMembers;
  }

  private async runMember(
    member: EnsembleMember,
    content: string,
    context: Record<string, unknown>,
    options: ParadigmOptions
  ): Promise<MemberResult> {
    const startTime = Date.now();

    try {
      const response = await this.llmClient.complete(
        member.provider,
        [
          { role: 'system', content: ENSEMBLE_SYSTEM_PROMPT },
          { role: 'user', content: ENSEMBLE_USER_PROMPT(content, context) },
        ],
        {
          model: member.model,
          temperature: 0.1,
          maxTokens: 512,
          timeout: options.timeout || 30000,
        }
      );

      const parsed = parseVerificationResponse(response.content);

      return {
        member,
        verdict: parsed.verdict,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        member,
        verdict: null,
        confidence: 0,
        reasoning: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        inputTokens: 0,
        outputTokens: 0,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  private aggregateResults(results: MemberResult[]): {
    verdict: Verdict;
    confidence: number;
  } {
    const validResults = results.filter((r) => r.verdict !== null && !r.error);

    if (validResults.length === 0) {
      return { verdict: 'uncertain', confidence: 0 };
    }

    // Calculate weighted votes
    let trueWeight = 0;
    let falseWeight = 0;
    let uncertainWeight = 0;

    for (const result of validResults) {
      const weight = result.member.weight * result.confidence;

      if (result.verdict === 'true') {
        trueWeight += weight;
      } else if (result.verdict === 'false') {
        falseWeight += weight;
      } else {
        uncertainWeight += weight;
      }
    }

    const totalWeight = trueWeight + falseWeight + uncertainWeight;

    // Determine verdict by majority
    let verdict: Verdict;
    let confidence: number;

    if (trueWeight > falseWeight && trueWeight > uncertainWeight) {
      verdict = 'true';
      confidence = trueWeight / totalWeight;
    } else if (falseWeight > trueWeight && falseWeight > uncertainWeight) {
      verdict = 'false';
      confidence = falseWeight / totalWeight;
    } else {
      verdict = 'uncertain';
      confidence = Math.max(uncertainWeight / totalWeight, 0.5);
    }

    // Adjust confidence based on agreement level
    const agreementRatio = Math.max(trueWeight, falseWeight, uncertainWeight) / totalWeight;
    confidence *= agreementRatio;

    return { verdict, confidence };
  }

  private formatReasoning(
    results: MemberResult[],
    aggregated: { verdict: Verdict; confidence: number }
  ): string {
    const lines: string[] = [`Ensemble of ${results.length} models:`, ''];

    for (const result of results) {
      const status = result.error
        ? `❌ Error: ${result.error}`
        : `${result.verdict} (${(result.confidence * 100).toFixed(0)}%)`;

      lines.push(`• ${result.member.provider}/${result.member.model}: ${status}`);

      if (result.reasoning && !result.error) {
        lines.push(`  └─ ${result.reasoning.slice(0, 100)}...`);
      }
    }

    lines.push('');
    lines.push(
      `Consensus: ${aggregated.verdict} with ${(aggregated.confidence * 100).toFixed(1)}% confidence`
    );

    return lines.join('\n');
  }

}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createEnsembleParadigm(keys: ProviderKeys): EnsembleParadigm {
  return new EnsembleParadigm(keys);
}
