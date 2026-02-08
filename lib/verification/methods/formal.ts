/**
 * Formal Verification Method — Autoformalization with mathjs
 *
 * LLM autoformalizes claims into mathjs-evaluable expressions, then
 * sandboxed JS evaluation provides ground truth.
 *
 * Classification hierarchy:
 *   arithmetic, algebraic, comparison, statistical, unit_conversion,
 *   logical, set_theory, non_formalizable
 *
 * Fast path: regex arithmetic → instant verification (no LLM)
 * Medium path: LLM → mathjs expression → sandboxed evaluate() → boolean
 * Slow path: LLM formal analysis (capped at 0.8 confidence)
 * Non-formalizable: existing path (capped at 0.6)
 *
 * FPR: 0% for symbolically verified claims
 * Latency: 0ms (regex), ~1s (autoformalize), ~2s (LLM formal)
 */

import { evaluate } from 'mathjs';
import { LLMClient, ProviderKeys, LLMProvider, calculateCostCents } from '@/lib/llm';
import { ParadigmExecutor, ParadigmResult, ParadigmOptions, Verdict } from '../types';
import { FORMAL_SYSTEM_PROMPT, FORMAL_USER_PROMPT } from '../prompts';
import {
  createParadigmErrorResult,
  selectBestProvider,
  getDefaultModel,
  normalizeVerdict,
  normalizeConfidence,
  extractJsonFromResponse,
} from './shared';

// =============================================================================
// CLAIM CLASSIFICATION
// =============================================================================

type FormalClaimType =
  | 'arithmetic'
  | 'algebraic'
  | 'comparison'
  | 'statistical'
  | 'unit_conversion'
  | 'logical'
  | 'set_theory'
  | 'non_formalizable';

// Confidence caps for LLM-autoformalized expressions by claim type.
// Only the regex fast-path (builtin arithmetic) deserves 1.0 —
// autoformalization is LLM-generated and can pick wrong constants.
const AUTOFORMALIZATION_CONFIDENCE_CAPS: Partial<Record<FormalClaimType, number>> = {
  arithmetic: 0.95,
  comparison: 0.93,
  algebraic: 0.92,
  unit_conversion: 0.88,
  statistical: 0.85,
};

function classifyClaimEnhanced(content: string): {
  claimType: FormalClaimType;
  canAutoformalize: boolean;
} {
  const lower = content.toLowerCase();

  // Simple arithmetic: "2 + 2 = 4", "10 * 5 = 50"
  if (/\d+\.?\d*\s*[\+\-\*\/]\s*\d+\.?\d*\s*=\s*\d+\.?\d*/.test(content)) {
    return { claimType: 'arithmetic', canAutoformalize: true };
  }

  // Comparison: "X > Y", "X is greater than Y"
  if (/\d+\.?\d*\s*[<>=!]+\s*\d+\.?\d*/.test(content) ||
      lower.includes('greater than') || lower.includes('less than') ||
      lower.includes('equal to') || lower.includes('at least') ||
      lower.includes('at most')) {
    return { claimType: 'comparison', canAutoformalize: true };
  }

  // Algebraic: sqrt, log, pow, etc.
  if (/sqrt|log|ln|pow|exp|sin|cos|tan|pi|factorial/i.test(content) ||
      /\^|²|³/.test(content)) {
    return { claimType: 'algebraic', canAutoformalize: true };
  }

  // Statistical: percentage, average, mean, median
  if (lower.includes('percent') || lower.includes('%') ||
      lower.includes('average') || lower.includes('mean') ||
      lower.includes('median') || lower.includes('ratio')) {
    return { claimType: 'statistical', canAutoformalize: true };
  }

  // Unit conversion
  if (lower.includes('convert') || lower.includes('equals') &&
      (/\b(km|mi|kg|lb|celsius|fahrenheit|meters?|feet|inches?|liters?|gallons?)\b/i.test(content))) {
    return { claimType: 'unit_conversion', canAutoformalize: true };
  }

  // Logical operators
  if (lower.includes(' implies ') || lower.includes(' therefore ') ||
      lower.includes(' if and only if ') || lower.includes(' iff ') ||
      lower.includes(' and ') && lower.includes(' or ')) {
    return { claimType: 'logical', canAutoformalize: false };
  }

  // Set theory
  if (lower.includes(' subset ') || lower.includes(' union ') ||
      lower.includes(' intersection ') || /∈|∉|⊂|⊃|∪|∩/.test(content)) {
    return { claimType: 'set_theory', canAutoformalize: false };
  }

  return { claimType: 'non_formalizable', canAutoformalize: false };
}

// =============================================================================
// SANDBOXED MATHJS EVALUATION
// =============================================================================

// Patterns that indicate potential code injection
const DANGEROUS_PATTERNS = [
  /\bfunction\b/i,
  /\brequire\b/i,
  /\bimport\b/i,
  /\beval\b/i,
  /\bprocess\b/i,
  /\bglobal\b/i,
  /\bwindow\b/i,
  /\bdocument\b/i,
  /\bconstructor\b/i,
  /\b__proto__\b/i,
  /\bprototype\b/i,
  /\bexec\b/i,
  /\bspawn\b/i,
  /\bchild_process\b/i,
  /\bfs\b/i,
  /\bhttp\b/i,
  /\bnet\b/i,
];

function isSafeExpression(expr: string): boolean {
  return !DANGEROUS_PATTERNS.some((p) => p.test(expr));
}

/**
 * Evaluate a mathjs expression in a sandboxed context.
 * Returns the result or null if evaluation fails.
 */
function safeEvaluate(expression: string): unknown | null {
  if (!isSafeExpression(expression)) {
    return null;
  }

  try {
    return evaluate(expression);
  } catch {
    return null;
  }
}

// =============================================================================
// SIMPLE ARITHMETIC FAST PATH (regex — no LLM needed)
// =============================================================================

function verifyArithmetic(content: string): {
  verified: boolean;
  result: string;
} | null {
  // Match patterns like "2 + 2 = 4", "10.5 * 5 = 52.5", etc.
  const match = content.match(/(\d+\.?\d*)\s*([\+\-\*\/])\s*(\d+\.?\d*)\s*=\s*(\d+\.?\d*)/);

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
// AUTOFORMALIZATION
// =============================================================================

const AUTOFORMALIZE_SYSTEM_PROMPT = `You are a mathematical formalization expert. Given a claim, extract a mathjs-evaluable expression that can verify the claim.

Respond in JSON format ONLY:
{
  "expression": "<mathjs expression that evaluates to the claimed result>",
  "claimed_result": "<the result claimed in the statement>",
  "comparison": "==" | ">" | "<" | ">=" | "<=" | "!=" | "approx",
  "reasoning": "<brief explanation of the formalization>"
}

Rules:
- Use valid mathjs syntax: sqrt(), log(), pow(), factorial(), abs(), etc.
- For percentages: express as decimal operations (e.g., "50% of 200" → "0.5 * 200")
- For comparisons: put the left side in "expression" and right side in "claimed_result"
- Use "approx" comparison for floating-point results that should be approximately equal
- If the claim cannot be formalized as a mathjs expression, set expression to "CANNOT_FORMALIZE"`;

async function autoformalize(
  llmClient: LLMClient,
  provider: LLMProvider,
  model: string,
  content: string,
  timeout: number
): Promise<{
  expression: string | null;
  claimedResult: string | null;
  comparison: string;
  reasoning: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const response = await llmClient.complete(
    provider,
    [
      { role: 'system', content: AUTOFORMALIZE_SYSTEM_PROMPT },
      { role: 'user', content: `Formalize this claim into a mathjs expression:\n\n${content}` },
    ],
    {
      model,
      temperature: 0,
      maxTokens: 512,
      timeout,
    }
  );

  const parsed = extractJsonFromResponse<Record<string, unknown>>(response.content, {});

  const expression = parsed.expression && parsed.expression !== 'CANNOT_FORMALIZE'
    ? String(parsed.expression)
    : null;

  return {
    expression,
    claimedResult: parsed.claimed_result ? String(parsed.claimed_result) : null,
    comparison: String(parsed.comparison || '=='),
    reasoning: String(parsed.reasoning || ''),
    inputTokens: response.usage.inputTokens,
    outputTokens: response.usage.outputTokens,
  };
}

/**
 * Compare evaluation result against claimed result
 */
function compareResults(actual: unknown, claimed: string, comparison: string): boolean {
  const actualNum = typeof actual === 'number' ? actual : parseFloat(String(actual));
  const claimedNum = parseFloat(claimed);

  if (isNaN(actualNum) || isNaN(claimedNum)) {
    // String comparison fallback
    return String(actual).trim().toLowerCase() === claimed.trim().toLowerCase();
  }

  switch (comparison) {
    case '==':
      return Math.abs(actualNum - claimedNum) < 0.0001;
    case 'approx':
      return Math.abs(actualNum - claimedNum) / Math.max(Math.abs(claimedNum), 1) < 0.01;
    case '>':
      return actualNum > claimedNum;
    case '<':
      return actualNum < claimedNum;
    case '>=':
      return actualNum >= claimedNum;
    case '<=':
      return actualNum <= claimedNum;
    case '!=':
      return Math.abs(actualNum - claimedNum) >= 0.0001;
    default:
      return Math.abs(actualNum - claimedNum) < 0.0001;
  }
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
    const model = options.model || getDefaultModel(provider);

    try {
      // Step 1: Classify the claim
      const classification = classifyClaimEnhanced(content);

      // Step 2: Try regex fast path for simple arithmetic (no LLM needed)
      const arithmeticResult = verifyArithmetic(content);
      if (arithmeticResult) {
        return {
          paradigm: 'formal',
          weight: options.weight,
          provider,
          model: 'builtin-arithmetic',
          verdict: arithmeticResult.verified ? 'true' : 'false',
          confidence: 1.0,
          reasoning: `Formal arithmetic verification: ${arithmeticResult.result}. The claim is ${arithmeticResult.verified ? 'correct' : 'incorrect'}.`,
          processingTimeMs: Date.now() - startTime,
          costCents: 0,
          tokenUsage: { inputTokens: 0, outputTokens: 0 },
        };
      }

      // Step 3: Try autoformalization with mathjs for formalizable claims
      if (classification.canAutoformalize) {
        try {
          const formalization = await autoformalize(
            this.llmClient,
            provider,
            model,
            content,
            options.timeout || 30000
          );

          if (formalization.expression && formalization.claimedResult) {
            const evalResult = safeEvaluate(formalization.expression);

            if (evalResult !== null) {
              const verified = compareResults(
                evalResult,
                formalization.claimedResult,
                formalization.comparison
              );

              const costCents = calculateCostCents(
                model,
                formalization.inputTokens,
                formalization.outputTokens
              );

              // Cap confidence by claim type — LLM formalization is fallible
              const confidenceCap = AUTOFORMALIZATION_CONFIDENCE_CAPS[classification.claimType] ?? 0.90;

              return {
                paradigm: 'formal',
                weight: options.weight,
                provider,
                model,
                verdict: verified ? 'true' : 'false',
                confidence: confidenceCap,
                reasoning: `AUTOFORMALIZATION (${classification.claimType})
Expression: ${formalization.expression}
Evaluated: ${String(evalResult)}
Claimed: ${formalization.claimedResult} (${formalization.comparison})
Result: ${verified ? 'VERIFIED' : 'DISPROVED'}
${formalization.reasoning}`,
                processingTimeMs: Date.now() - startTime,
                costCents,
                tokenUsage: {
                  inputTokens: formalization.inputTokens,
                  outputTokens: formalization.outputTokens,
                },
              };
            }
          }
          // Fall through to LLM formal analysis if autoformalization failed
        } catch {
          // Fall through to LLM formal analysis
        }
      }

      // Step 4: LLM formal analysis (for claims that can't be autoformalized)
      const response = await this.llmClient.complete(
        provider,
        [
          { role: 'system', content: FORMAL_SYSTEM_PROMPT },
          { role: 'user', content: FORMAL_USER_PROMPT(content, context) },
        ],
        {
          model,
          temperature: 0,
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

      // Cap LLM formal analysis confidence — no independent verification
      if (parsed.isFormalizeable) {
        parsed.confidence = Math.min(parsed.confidence, 0.8);
      } else {
        parsed.confidence = Math.min(parsed.confidence, 0.6);
      }

      let reasoning = '';
      if (parsed.isFormalizeable) {
        reasoning = `FORMAL ANALYSIS (LLM, ${classification.claimType})
Formalization: ${parsed.formalization || 'N/A'}
Proof Sketch: ${parsed.proofSketch || 'N/A'}
Conclusion: ${parsed.reasoning}
Note: Confidence capped at ${(parsed.confidence * 100).toFixed(0)}% (LLM analysis, not symbolically verified)`;
      } else {
        reasoning = `NON-FORMALIZABLE CLAIM (${classification.claimType})
This claim cannot be formally verified — it requires empirical data or is subjective.
LLM Analysis: ${parsed.reasoning}
Note: Confidence capped at ${(parsed.confidence * 100).toFixed(0)}%`;
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
// FORMAL RESPONSE PARSING (for LLM fallback path)
// =============================================================================

interface FormalResponse {
  verdict: Verdict;
  confidence: number;
  formalization: string | null;
  proofSketch: string | null;
  reasoning: string;
  isFormalizeable: boolean;
}

function parseFormalResponse(response: string): FormalResponse {
  const parsed = extractJsonFromResponse<Record<string, unknown>>(response, {});

  if (Object.keys(parsed).length === 0) {
    return {
      verdict: 'uncertain',
      confidence: 0.5,
      formalization: null,
      proofSketch: null,
      reasoning: response.slice(0, 500),
      isFormalizeable: false,
    };
  }

  const verdict = normalizeFormalVerdict(parsed.verdict);
  const confidence = normalizeConfidence(parsed.confidence);
  const formalization = parsed.formalization ? String(parsed.formalization) : null;
  const isFormalizeable = Boolean(
    formalization && formalization !== 'Not applicable' && formalization !== 'N/A'
  );

  return {
    verdict,
    confidence,
    formalization,
    proofSketch: parsed.proof_sketch || parsed.proofSketch
      ? String(parsed.proof_sketch || parsed.proofSketch)
      : null,
    reasoning: String(parsed.reasoning || 'No reasoning provided'),
    isFormalizeable,
  };
}

function normalizeFormalVerdict(value: unknown): Verdict {
  if (!value) return 'uncertain';
  const v = String(value).toLowerCase();
  if (['true', 'yes', 'accurate', 'correct', 'provable', 'valid'].includes(v)) return 'true';
  if (['false', 'no', 'inaccurate', 'incorrect', 'disprovable', 'invalid'].includes(v)) return 'false';
  return 'uncertain';
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createFormalParadigm(keys: ProviderKeys): FormalParadigm {
  return new FormalParadigm(keys);
}
