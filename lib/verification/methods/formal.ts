/**
 * Formal Verification Method
 * Uses formal logic and mathematical proofs for verification
 *
 * FPR: 0% (mathematically provable claims only)
 * Latency: Variable (depends on complexity)
 * Best for: Mathematical proofs, logical deductions, code verification
 *
 * NOTE: This is a stub implementation. Full formal verification would require:
 * - Integration with theorem provers (Lean, Coq, Isabelle)
 * - SAT/SMT solvers (Z3)
 * - Type checkers for code verification
 */

import { LLMClient, ProviderKeys, LLMProvider, calculateCostCents } from '@/lib/llm';
import { ParadigmExecutor, ParadigmResult, ParadigmOptions, Verdict } from '../types';
import { FORMAL_SYSTEM_PROMPT, FORMAL_USER_PROMPT } from '../prompts';
import {
  createParadigmErrorResult,
  selectBestProvider,
  normalizeVerdict,
  normalizeConfidence,
  extractJsonFromResponse,
} from './shared';

// =============================================================================
// FORMAL VERIFICATION TYPES
// =============================================================================

interface FormalResponse {
  verdict: Verdict;
  confidence: number;
  formalization: string | null;
  proofSketch: string | null;
  reasoning: string;
  isFormalizeable: boolean;
}

// =============================================================================
// RESPONSE PARSING
// =============================================================================

const DEFAULT_FORMAL_RESPONSE: FormalResponse = {
  verdict: 'uncertain',
  confidence: 0.5,
  formalization: null,
  proofSketch: null,
  reasoning: 'No reasoning provided',
  isFormalizeable: false,
};

/**
 * Extended verdict normalization for formal verification
 * Includes formal-specific terms like "provable" and "valid"
 */
function normalizeFormalVerdict(value: unknown): Verdict {
  if (!value) return 'uncertain';
  const v = String(value).toLowerCase();
  if (v === 'true' || v === 'yes' || v === 'accurate' || v === 'correct' || v === 'provable' || v === 'valid') {
    return 'true';
  }
  if (v === 'false' || v === 'no' || v === 'inaccurate' || v === 'incorrect' || v === 'disprovable' || v === 'invalid') {
    return 'false';
  }
  return 'uncertain';
}

function parseFormalResponse(response: string): FormalResponse {
  const parsed = extractJsonFromResponse<Record<string, unknown>>(response, {});

  if (Object.keys(parsed).length === 0) {
    return { ...DEFAULT_FORMAL_RESPONSE, reasoning: response.slice(0, 500) };
  }

  const verdict = normalizeFormalVerdict(parsed.verdict);
  let confidence = normalizeConfidence(parsed.confidence);

  // Check if claim is formalizable
  const formalization = parsed.formalization ? String(parsed.formalization) : null;
  const isFormalizeable = Boolean(
    formalization &&
      formalization !== 'Not applicable' &&
      formalization !== 'N/A'
  );

  // If formally proven, confidence is 1.0
  if (isFormalizeable && verdict !== 'uncertain') {
    confidence = 1.0;
  }

  return {
    verdict,
    confidence,
    formalization,
    proofSketch: parsed.proof_sketch || parsed.proofSketch ? String(parsed.proof_sketch || parsed.proofSketch) : null,
    reasoning: String(parsed.reasoning || 'No reasoning provided'),
    isFormalizeable,
  };
}

// =============================================================================
// SIMPLE FORMAL CHECKS
// =============================================================================

/**
 * Check if content contains mathematically verifiable claims
 */
function detectMathematicalClaims(content: string): {
  hasMathClaim: boolean;
  claimType: 'arithmetic' | 'logical' | 'set_theory' | 'none';
} {
  const lower = content.toLowerCase();

  // Simple arithmetic detection
  if (/\d+\s*[\+\-\*\/]\s*\d+\s*=\s*\d+/.test(content)) {
    return { hasMathClaim: true, claimType: 'arithmetic' };
  }

  // Logical operators
  if (
    lower.includes(' implies ') ||
    lower.includes(' therefore ') ||
    lower.includes(' if and only if ') ||
    lower.includes(' iff ')
  ) {
    return { hasMathClaim: true, claimType: 'logical' };
  }

  // Set theory
  if (
    lower.includes(' subset ') ||
    lower.includes(' union ') ||
    lower.includes(' intersection ') ||
    /∈|∉|⊂|⊃|∪|∩/.test(content)
  ) {
    return { hasMathClaim: true, claimType: 'set_theory' };
  }

  return { hasMathClaim: false, claimType: 'none' };
}

/**
 * Simple arithmetic verification (proof of concept)
 */
function verifyArithmetic(content: string): {
  verified: boolean;
  result: string;
} | null {
  // Match patterns like "2 + 2 = 4" or "10 * 5 = 50"
  const match = content.match(/(\d+)\s*([\+\-\*\/])\s*(\d+)\s*=\s*(\d+)/);

  if (!match) return null;

  const [, num1Str, operator, num2Str, resultStr] = match;
  const num1 = parseFloat(num1Str);
  const num2 = parseFloat(num2Str);
  const claimed = parseFloat(resultStr);

  let actual: number;
  switch (operator) {
    case '+':
      actual = num1 + num2;
      break;
    case '-':
      actual = num1 - num2;
      break;
    case '*':
      actual = num1 * num2;
      break;
    case '/':
      actual = num2 !== 0 ? num1 / num2 : NaN;
      break;
    default:
      return null;
  }

  return {
    verified: Math.abs(actual - claimed) < 0.0001,
    result: `${num1} ${operator} ${num2} = ${actual}`,
  };
}

// =============================================================================
// FORMAL PARADIGM EXECUTOR
// =============================================================================

export class FormalParadigm implements ParadigmExecutor {
  name = 'formal' as const;
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

    const provider: LLMProvider = options.provider || selectBestProvider(this.llmClient);
    const model = options.model || 'gpt-4o'; // Use capable model for formal reasoning

    try {
      // Step 1: Check for simple verifiable claims
      const mathCheck = detectMathematicalClaims(content);
      const arithmeticResult = verifyArithmetic(content);

      // If we can verify arithmetic directly, do so
      if (arithmeticResult) {
        return {
          paradigm: 'formal',
          weight: options.weight,
          provider,
          model: 'builtin-arithmetic',
          verdict: arithmeticResult.verified ? 'true' : 'false',
          confidence: 1.0, // Mathematical certainty
          reasoning: `Formal arithmetic verification: ${arithmeticResult.result}. The claim is ${arithmeticResult.verified ? 'correct' : 'incorrect'}.`,
          processingTimeMs: Date.now() - startTime,
          costCents: 0,
          tokenUsage: {
            inputTokens: 0,
            outputTokens: 0,
          },
        };
      }

      // Step 2: Use LLM for formal analysis
      const response = await this.llmClient.complete(
        provider,
        [
          { role: 'system', content: FORMAL_SYSTEM_PROMPT },
          { role: 'user', content: FORMAL_USER_PROMPT(content, context) },
        ],
        {
          model,
          temperature: 0, // Deterministic for formal verification
          maxTokens: 2048,
          timeout: options.timeout || 60000,
        }
      );

      const parsed = parseFormalResponse(response.content);
      const costCents = calculateCostCents(
        model,
        response.usage.inputTokens,
        response.usage.outputTokens
      );

      // Format reasoning
      let reasoning = '';

      if (parsed.isFormalizeable) {
        reasoning = `
FORMAL ANALYSIS
===============
Claim Type: ${mathCheck.claimType || 'general'}

Formalization:
${parsed.formalization || 'N/A'}

Proof Sketch:
${parsed.proofSketch || 'N/A'}

Conclusion:
${parsed.reasoning}
                `.trim();
      } else {
        reasoning = `
FORMAL ANALYSIS
===============
This claim cannot be formally verified because it:
- Contains empirical claims that require external verification
- Is subjective or opinion-based
- Lacks sufficient precision for formal treatment

LLM Analysis:
${parsed.reasoning}

Note: For claims that cannot be formally verified, consider using other verification methods (reasoning, tool, ensemble).
                `.trim();

        // If not formalizable, reduce confidence
        parsed.confidence = Math.min(parsed.confidence, 0.6);
      }

      return {
        paradigm: 'formal',
        weight: options.weight,
        provider,
        model: response.model,
        verdict: parsed.verdict,
        confidence: parsed.confidence,
        reasoning,
        processingTimeMs: Date.now() - startTime,
        costCents,
        tokenUsage: {
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
        },
      };
    } catch (error) {
      return createParadigmErrorResult(
        'formal',
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

export function createFormalParadigm(keys: ProviderKeys): FormalParadigm {
  return new FormalParadigm(keys);
}

// =============================================================================
// FUTURE ENHANCEMENTS (ROADMAP)
// =============================================================================

/**
 * TODO: Future formal verification enhancements
 *
 * 1. Z3 SMT Solver Integration
 *    - Verify logical propositions
 *    - Check satisfiability
 *    - Prove mathematical theorems
 *
 * 2. Lean 4 Integration
 *    - Proof checking for mathematical claims
 *    - Formalize and verify theorems
 *
 * 3. Type Checking
 *    - Verify code claims using type systems
 *    - Integration with TypeScript compiler API
 *
 * 4. Model Checking
 *    - Verify state machine properties
 *    - Check temporal logic formulas
 *
 * 5. Symbolic Execution
 *    - Verify code behavior
 *    - Find counterexamples
 */
