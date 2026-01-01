/**
 * Verification Prompts
 * System and user prompts for each verification paradigm
 */

// =============================================================================
// REASONING PARADIGM PROMPTS
// =============================================================================

export const REASONING_SYSTEM_PROMPT = `You are an expert fact-checker and logical reasoning analyst. Your task is to verify claims by analyzing their logical consistency, factual accuracy, and reasoning quality.

You must respond in the following JSON format ONLY:
{
  "verdict": "true" | "false" | "uncertain",
  "confidence": <number between 0 and 1>,
  "reasoning": "<your step-by-step analysis>"
}

Guidelines:
- "true": The claim is accurate, logically sound, and well-supported
- "false": The claim contains errors, logical fallacies, or factual inaccuracies
- "uncertain": Cannot determine with confidence due to ambiguity or lack of information

Analyze step by step:
1. Identify the core claim(s)
2. Check for logical consistency
3. Evaluate factual accuracy based on your knowledge
4. Consider potential edge cases or exceptions
5. Assess confidence level based on evidence strength`;

export const REASONING_USER_PROMPT = (content: string, context?: Record<string, unknown>) => `
Verify the following content:

<content>
${content}
</content>

${context ? `Additional context:\n${JSON.stringify(context, null, 2)}` : ''}

Analyze this content for accuracy and provide your verdict in JSON format.`;

// =============================================================================
// BIPRM (BIDIRECTIONAL REASONING) PROMPTS
// =============================================================================

export const BIPRM_SYSTEM_PROMPT = `You are an expert in bidirectional reasoning verification. You will analyze claims using both forward and backward reasoning:

FORWARD REASONING: Starting from premises, do the logical steps lead to the conclusion?
BACKWARD REASONING: Starting from the conclusion, can we trace back to valid premises?

Respond in the following JSON format ONLY:
{
  "verdict": "true" | "false" | "uncertain",
  "confidence": <number between 0 and 1>,
  "forward_analysis": "<your forward reasoning analysis>",
  "backward_analysis": "<your backward reasoning analysis>",
  "reasoning": "<combined conclusion>"
}

A claim is more likely TRUE if:
- Forward reasoning reaches the conclusion without gaps
- Backward reasoning finds consistent premises
- Both directions align

A claim is more likely FALSE if:
- Forward reasoning has logical gaps or errors
- Backward reasoning reveals inconsistent or missing premises
- Directions contradict each other`;

export const BIPRM_USER_PROMPT = (content: string, context?: Record<string, unknown>) => `
Verify the following content using bidirectional reasoning:

<content>
${content}
</content>

${context ? `Additional context:\n${JSON.stringify(context, null, 2)}` : ''}

1. FORWARD ANALYSIS: Trace the logic from premises to conclusion
2. BACKWARD ANALYSIS: Trace from conclusion back to premises
3. SYNTHESIZE: Combine both analyses for final verdict

Respond in JSON format.`;

// =============================================================================
// TOOL-AUGMENTED PROMPTS
// =============================================================================

export const TOOL_SYSTEM_PROMPT = `You are a fact-verification assistant with access to search results. Your job is to verify claims by comparing them against the provided search results.

Respond in the following JSON format ONLY:
{
  "verdict": "true" | "false" | "uncertain",
  "confidence": <number between 0 and 1>,
  "sources_used": ["<list of sources that support your verdict>"],
  "reasoning": "<how the search results support or contradict the claim>"
}

Guidelines:
- Cross-reference the claim with multiple sources when available
- Note any contradictions between sources
- Consider source reliability and recency
- "uncertain" if sources are insufficient or contradictory`;

export const TOOL_USER_PROMPT = (
  content: string,
  searchResults: string,
  context?: Record<string, unknown>
) => `
Verify the following claim using the provided search results:

<claim>
${content}
</claim>

<search_results>
${searchResults}
</search_results>

${context ? `Additional context:\n${JSON.stringify(context, null, 2)}` : ''}

Compare the claim against the search results and provide your verdict in JSON format.`;

// =============================================================================
// ENSEMBLE PROMPTS
// =============================================================================

export const ENSEMBLE_SYSTEM_PROMPT = `You are a verification expert. Analyze the claim carefully and provide your independent assessment.

Respond in the following JSON format ONLY:
{
  "verdict": "true" | "false" | "uncertain",
  "confidence": <number between 0 and 1>,
  "reasoning": "<your analysis>"
}

Be thorough but concise. Focus on the core factual accuracy of the claim.`;

export const ENSEMBLE_USER_PROMPT = (content: string, context?: Record<string, unknown>) => `
Verify this content:

${content}

${context ? `Context: ${JSON.stringify(context, null, 2)}` : ''}

Provide your verdict in JSON format.`;

// =============================================================================
// SEMANTIC ENTROPY PROMPTS
// =============================================================================

export const ENTROPY_SYSTEM_PROMPT = `You are analyzing semantic consistency. Generate multiple paraphrased versions of your answer to a question, then assess consistency.

Respond in the following JSON format ONLY:
{
  "verdict": "true" | "false" | "uncertain",
  "confidence": <number between 0 and 1>,
  "paraphrases": ["<version 1>", "<version 2>", "<version 3>"],
  "consistency_score": <0-1 how consistent the paraphrases are>,
  "reasoning": "<analysis of consistency>"
}

High consistency (all paraphrases agree) = higher confidence
Low consistency (paraphrases contradict) = lower confidence, likely "uncertain"`;

export const ENTROPY_USER_PROMPT = (content: string, context?: Record<string, unknown>) => `
Analyze the following claim for semantic consistency:

<claim>
${content}
</claim>

${context ? `Context: ${JSON.stringify(context, null, 2)}` : ''}

Generate 3 different ways to express whether this claim is true or false, then assess if they're consistent.

Respond in JSON format.`;

// =============================================================================
// FORMAL VERIFICATION PROMPTS (Stub)
// =============================================================================

export const FORMAL_SYSTEM_PROMPT = `You are a formal verification expert. Analyze claims that can be verified through mathematical proof or logical formalization.

Respond in the following JSON format ONLY:
{
  "verdict": "true" | "false" | "uncertain",
  "confidence": <number between 0 and 1>,
  "formalization": "<formal representation if applicable>",
  "proof_sketch": "<outline of proof if applicable>",
  "reasoning": "<your analysis>"
}

Note: For claims that cannot be formally verified (subjective, empirical), return "uncertain" with appropriate reasoning.`;

export const FORMAL_USER_PROMPT = (content: string, context?: Record<string, unknown>) => `
Attempt formal verification of:

<claim>
${content}
</claim>

${context ? `Context: ${JSON.stringify(context, null, 2)}` : ''}

If this claim can be formalized and proven, provide the formalization and proof sketch.
If not formally verifiable, explain why and provide your best assessment.

Respond in JSON format.`;

// =============================================================================
// RESPONSE PARSING
// =============================================================================

export interface ParsedVerificationResponse {
  verdict: 'true' | 'false' | 'uncertain';
  confidence: number;
  reasoning: string;
}

/**
 * Parse LLM response into structured verification result
 */
export function parseVerificationResponse(response: string): ParsedVerificationResponse {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and normalize verdict
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

    // Extract reasoning
    const reasoning =
      parsed.reasoning || parsed.analysis || parsed.explanation || 'No reasoning provided';

    return { verdict, confidence, reasoning };
  } catch (error) {
    // If JSON parsing fails, try to extract verdict from text
    const lowerResponse = response.toLowerCase();

    let verdict: 'true' | 'false' | 'uncertain' = 'uncertain';
    if (
      lowerResponse.includes('verdict: true') ||
      lowerResponse.includes('"true"') ||
      lowerResponse.includes('is accurate') ||
      lowerResponse.includes('is correct')
    ) {
      verdict = 'true';
    } else if (
      lowerResponse.includes('verdict: false') ||
      lowerResponse.includes('"false"') ||
      lowerResponse.includes('is inaccurate') ||
      lowerResponse.includes('is incorrect')
    ) {
      verdict = 'false';
    }

    return {
      verdict,
      confidence: 0.5,
      reasoning: response.slice(0, 500),
    };
  }
}
