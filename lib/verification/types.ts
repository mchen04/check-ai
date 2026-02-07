/**
 * Verification Types
 * Types for the multi-paradigm verification system
 *
 * This is the single source of truth for all verification-related types.
 * Other modules should import from here rather than defining duplicates.
 */

import { z } from 'zod';
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

/**
 * Human-readable display names for each paradigm
 */
export const PARADIGM_DISPLAY_NAMES: Record<ParadigmType, string> = {
  semantic: 'Semantic Analysis',
  reasoning: 'LLM Reasoning',
  tool: 'Tool-Augmented',
  biprm: 'Bidirectional Reasoning',
  ensemble: 'Multi-Model Ensemble',
  entropy: 'Semantic Entropy',
  formal: 'Formal Verification',
};

/**
 * Brief descriptions for each paradigm
 */
export const PARADIGM_DESCRIPTIONS: Record<ParadigmType, string> = {
  semantic: 'Boltzmann energy distributions over embedding space',
  reasoning: 'Adaptive self-refinement with conditional critique',
  tool: 'CLoVE contrastive verification with source independence',
  biprm: 'Parallel bidirectional reasoning with step-level scoring',
  ensemble: 'Multi-model voting with conditional meta-judge adjudication',
  entropy: 'Dual-path entropy via logprobs or semantic clustering',
  formal: 'Autoformalization with mathjs symbolic evaluation',
};

/**
 * All paradigm types as an array for iteration
 */
export const ALL_PARADIGMS: ParadigmType[] = [
  'semantic',
  'reasoning',
  'tool',
  'biprm',
  'ensemble',
  'entropy',
  'formal',
];

/**
 * Format a paradigm key to its display name
 */
export function formatParadigmName(paradigm: string): string {
  return PARADIGM_DISPLAY_NAMES[paradigm as ParadigmType] || paradigm;
}

export type Verdict = 'true' | 'false' | 'uncertain';

export type Decision = 'accept' | 'refine' | 'escalate' | 'reject';

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const paradigmTypeSchema = z.enum([
  'semantic',
  'reasoning',
  'tool',
  'biprm',
  'ensemble',
  'entropy',
  'formal',
]);

export const verdictSchema = z.enum(['true', 'false', 'uncertain']);

export const decisionSchema = z.enum(['accept', 'refine', 'escalate', 'reject']);

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

export const methodsConfigSchema = z
  .object({
    semantic: z.number().min(0).max(1).optional(),
    reasoning: z.number().min(0).max(1).optional(),
    tool: z.number().min(0).max(1).optional(),
    biprm: z.number().min(0).max(1).optional(),
    ensemble: z.number().min(0).max(1).optional(),
    entropy: z.number().min(0).max(1).optional(),
    formal: z.number().min(0).max(1).optional(),
  })
  .refine(
    (data) => {
      const weights = Object.values(data).filter((v) => v !== undefined);
      return weights.length > 0;
    },
    { message: 'At least one verification method must be specified' }
  );

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
// VERIFY OPTIONS (User-configurable thresholds and retries)
// =============================================================================

/**
 * User-configurable options for verification requests
 * All options are optional with sensible defaults for backwards compatibility
 */
export interface VerifyOptions {
  /** Timeout in milliseconds (1000-300000) */
  timeout?: number;
  /** Minimum confidence threshold - triggers retryOnLowConfidence if set */
  minConfidence?: number;
  /** Override DECISION_THRESHOLDS.accept (0-1) - auto-approve if confidence >= this */
  acceptThreshold?: number;
  /** Override DECISION_THRESHOLDS.escalate (0-1) - human review if confidence < this with disagreement */
  escalateThreshold?: number;
  /** Per-paradigm retry count (0-5) - retries failed paradigm executions */
  maxRetries?: number;
  /** Retry all paradigms once if final confidence < minConfidence */
  retryOnLowConfidence?: boolean;
}

// =============================================================================
// FPR (FALSE POSITIVE RATE) WEIGHTS
// =============================================================================

/**
 * False Positive Rate weights for each paradigm
 * Lower FPR = Higher trust weight in consensus
 */
export const FPR_WEIGHTS: Record<ParadigmType, number> = {
  formal: 1.0, // 0% FPR - Mathematical certainty (symbolic verification)
  tool: 0.99, // ~1% FPR - CLoVE source independence
  reasoning: 0.95, // ~4-5% FPR - Self-critique reduces errors
  biprm: 0.93, // ~5-7% FPR - Parallel debiased directions
  entropy: 0.90, // ~8-10% FPR - Logprob + semantic clustering
  ensemble: 0.80, // ~15-20% FPR - Meta-judge adjudication
  semantic: 0.70, // ~20-30% FPR - Energy-based reduces FPR
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

/**
 * Resolved thresholds with user overrides applied
 */
export interface ResolvedThresholds {
  accept: number;
  refine: number;
  escalate: number;
  reject: number;
}

/**
 * Resolve thresholds with user-provided overrides
 * Falls back to DECISION_THRESHOLDS defaults for unspecified values
 */
export function resolveThresholds(options?: VerifyOptions): ResolvedThresholds {
  return {
    accept: options?.acceptThreshold ?? DECISION_THRESHOLDS.accept,
    refine: DECISION_THRESHOLDS.refine, // Not user-configurable
    escalate: options?.escalateThreshold ?? DECISION_THRESHOLDS.escalate,
    reject: DECISION_THRESHOLDS.reject, // Not user-configurable
  };
}

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
  } else if (trueWeight === falseWeight && trueWeight > uncertainWeight) {
    // Exact true/false tie — maximum disagreement signal
    verdict = 'uncertain';
    confidence = 0.5;
  } else {
    verdict = 'uncertain';
    // Use the average paradigm confidence for uncertain verdicts instead of
    // weight proportion (which is always 1.0 for single-method calls)
    const uncertainResults = validResults.filter((r) => r.verdict === 'uncertain');
    if (uncertainResults.length > 0) {
      const avgConfidence =
        uncertainResults.reduce((sum, r) => sum + r.confidence, 0) / uncertainResults.length;
      confidence = Math.min(avgConfidence, 0.5);
    } else {
      confidence = 0.5;
    }
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
 * Optionally accepts custom thresholds to override defaults
 */
export function determineDecision(
  verdict: Verdict,
  confidence: number,
  results: ParadigmResult[],
  thresholds?: ResolvedThresholds
): Decision {
  // Use provided thresholds or defaults
  const t = thresholds ?? DECISION_THRESHOLDS;

  // Check for high disagreement (paradigms strongly disagree)
  const trueCount = results.filter((r) => r.verdict === 'true').length;
  const falseCount = results.filter((r) => r.verdict === 'false').length;
  const validCount = results.filter((r) => r.verdict !== null).length;

  const disagreementRatio = validCount > 0 ? Math.min(trueCount, falseCount) / validCount : 0;

  if (confidence >= t.accept && verdict !== 'uncertain') {
    return 'accept';
  }

  if (confidence >= t.refine && verdict !== 'uncertain') {
    return 'refine';
  }

  if (confidence < t.refine && disagreementRatio > 0.3) {
    return 'escalate'; // High disagreement - needs human review
  }

  return 'reject';
}
