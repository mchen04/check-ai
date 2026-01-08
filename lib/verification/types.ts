/**
 * Verification Types
 * Types for the multi-paradigm verification system
 */

import { LLMProvider } from '@/lib/llm/types';

// =============================================================================
// PARADIGM TYPES
// =============================================================================

export type ParadigmType =
  | 'semantic'
  | 'reasoning'
  | 'tool'
  | 'biprm'
  | 'ensemble'
  | 'entropy'
  | 'formal';

export type Verdict = 'true' | 'false' | 'uncertain';

export type Decision = 'accept' | 'refine' | 'escalate' | 'reject';

// =============================================================================
// METHODS CONFIGURATION
// =============================================================================

export interface MethodsConfig {
  semantic?: number;
  reasoning?: number;
  tool?: number;
  biprm?: number;
  ensemble?: number;
  entropy?: number;
  formal?: number;
}

// =============================================================================
// PARADIGM RESULT
// =============================================================================

export interface ParadigmResult {
  paradigm: ParadigmType;
  weight: number;
  provider: LLMProvider;
  model: string;
  verdict: Verdict | null;
  confidence: number;
  reasoning: string | null;
  processingTimeMs: number;
  costCents: number;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
  error?: string;
}

// =============================================================================
// VERIFICATION RESULT
// =============================================================================

export interface VerificationResult {
  id: string;
  content: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'escalated';
  verdict: Verdict | null;
  confidence: number;
  decision: Decision;
  reasoning: string;
  paradigmResults: ParadigmResult[];
  processingTimeMs: number;
  costCents: number;
  cached: boolean;
}

// =============================================================================
// PARADIGM EXECUTOR INTERFACE
// =============================================================================

export interface ParadigmExecutor {
  name: ParadigmType;
  execute(
    content: string,
    context: Record<string, unknown>,
    options: ParadigmOptions
  ): Promise<ParadigmResult>;
}

export interface ParadigmOptions {
  weight: number;
  provider?: LLMProvider;
  model?: string;
  timeout?: number;
}

// =============================================================================
// FPR (FALSE POSITIVE RATE) WEIGHTS
// =============================================================================

/**
 * False Positive Rate weights for each paradigm
 * Lower FPR = Higher trust weight in consensus
 */
export const FPR_WEIGHTS: Record<ParadigmType, number> = {
  formal: 1.0, // 0% FPR - Mathematical certainty
  tool: 0.98, // ~2% FPR - Fact-grounded
  reasoning: 0.93, // ~7% FPR - LLM judge
  biprm: 0.9, // ~10% FPR - Bidirectional reasoning
  entropy: 0.85, // ~15% FPR - Consistency checking
  ensemble: 0.7, // ~30% FPR - Multi-model voting
  semantic: 0.3, // 50-100% FPR - Embedding similarity
};

// =============================================================================
// DECISION THRESHOLDS
// =============================================================================

export const DECISION_THRESHOLDS = {
  accept: 0.95, // High confidence - auto-approve
  refine: 0.7, // Medium confidence - needs refinement
  escalate: 0.5, // Low confidence with disagreement - human review
  reject: 0.3, // Low confidence with agreement - reject
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate consensus confidence from paradigm results
 */
export function calculateConsensus(results: ParadigmResult[]): {
  verdict: Verdict;
  confidence: number;
  reasoning: string;
} {
  const validResults = results.filter((r) => r.verdict !== null && !r.error);

  if (validResults.length === 0) {
    return {
      verdict: 'uncertain',
      confidence: 0,
      reasoning: 'No valid paradigm results available',
    };
  }

  // Calculate weighted votes
  let trueWeight = 0;
  let falseWeight = 0;
  let uncertainWeight = 0;

  for (const result of validResults) {
    const fprWeight = FPR_WEIGHTS[result.paradigm];
    const combinedWeight = fprWeight * result.weight * result.confidence;

    if (result.verdict === 'true') {
      trueWeight += combinedWeight;
    } else if (result.verdict === 'false') {
      falseWeight += combinedWeight;
    } else {
      uncertainWeight += combinedWeight;
    }
  }

  const totalWeight = trueWeight + falseWeight + uncertainWeight;

  // Determine verdict
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
    confidence = uncertainWeight / totalWeight || 0.5;
  }

  // Generate reasoning summary
  const reasoning = validResults
    .map(
      (r) =>
        `[${r.paradigm}] ${r.verdict} (${(r.confidence * 100).toFixed(1)}%): ${r.reasoning?.slice(0, 100) || 'No reasoning'}`
    )
    .join('\n');

  return { verdict, confidence, reasoning };
}

/**
 * Create an error result for a failed paradigm execution
 * Centralized factory to avoid duplication in orchestrator
 */
export function createErrorParadigmResult(
  paradigm: ParadigmType,
  weight: number,
  error: unknown
): ParadigmResult {
  return {
    paradigm,
    weight,
    provider: 'openai' as const,
    model: 'unknown',
    verdict: null,
    confidence: 0,
    reasoning: null,
    processingTimeMs: 0,
    costCents: 0,
    error: error instanceof Error ? error.message : 'Unknown error',
  };
}

/**
 * Determine decision based on confidence and verdict
 */
export function determineDecision(
  verdict: Verdict,
  confidence: number,
  results: ParadigmResult[]
): Decision {
  // Check for high disagreement (paradigms strongly disagree)
  const trueCount = results.filter((r) => r.verdict === 'true').length;
  const falseCount = results.filter((r) => r.verdict === 'false').length;
  const validCount = results.filter((r) => r.verdict !== null).length;

  const disagreementRatio = validCount > 0 ? Math.min(trueCount, falseCount) / validCount : 0;

  if (confidence >= DECISION_THRESHOLDS.accept && verdict !== 'uncertain') {
    return 'accept';
  }

  if (confidence >= DECISION_THRESHOLDS.refine && verdict !== 'uncertain') {
    return 'refine';
  }

  if (confidence < DECISION_THRESHOLDS.refine && disagreementRatio > 0.3) {
    return 'escalate'; // High disagreement - needs human review
  }

  return 'reject';
}
