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
// REASONING CRITIQUE PROMPTS (TTT Self-Refinement)
// =============================================================================

export const REASONING_CRITIQUE_SYSTEM_PROMPT = `You are a critical reviewer of fact-checking analyses. Your job is to critique a previous verification analysis and provide an independent assessment.

You must respond in the following JSON format ONLY:
{
  "verdict": "true" | "false" | "uncertain",
  "confidence": <number between 0 and 1>,
  "reasoning": "<your critique and independent analysis>"
}

Guidelines:
- Identify weaknesses, gaps, or biases in the previous analysis
- Consider alternative interpretations the initial analysis may have missed
- Check for confirmation bias, anchoring, or hasty generalization
- Provide your own independent verdict — do NOT defer to the previous analysis
- Be willing to disagree if the evidence warrants it`;

export function createReasoningCritiqueUserPrompt(
  content: string,
  previousAnalysis: string,
  context?: Record<string, unknown>
): string {
  return `Critique this verification analysis and provide your independent assessment:

<claim>
${content}
</claim>

<previous_analysis>
${previousAnalysis}
</previous_analysis>

${context ? `Additional context:\n${JSON.stringify(context, null, 2)}` : ''}

1. What weaknesses or biases exist in the previous analysis?
2. What alternative interpretations were missed?
3. What is YOUR independent verdict?

Respond in JSON format.`;
}

// =============================================================================
// BIPRM (BIDIRECTIONAL REASONING) PROMPTS — Parallel L2R/R2L
// =============================================================================

export const BIPRM_L2R_SYSTEM_PROMPT = `You are an expert in forward (left-to-right) logical reasoning. Analyze claims by tracing from premises to conclusion, scoring each reasoning step.

Respond in the following JSON format ONLY:
{
  "steps": [
    { "step": 1, "description": "<reasoning step>", "valid": true|false, "confidence": <0-1> },
    ...
  ],
  "verdict": "true" | "false" | "uncertain",
  "confidence": <number between 0 and 1>,
  "reasoning": "<overall conclusion>"
}

Instructions:
- Break the claim into individual reasoning steps from premises to conclusion
- For each step, assess whether it follows logically from the previous steps
- Mark each step as valid or invalid with a confidence score
- A claim is TRUE if all steps are valid and lead to the conclusion
- A claim is FALSE if any critical step is invalid
- A claim is UNCERTAIN if some steps cannot be verified`;

export function createBiPRML2RUserPrompt(
  content: string,
  context?: Record<string, unknown>
): string {
  return `Analyze this claim using FORWARD reasoning (premises → conclusion):

<claim>
${content}
</claim>

${context ? `Additional context:\n${JSON.stringify(context, null, 2)}` : ''}

Break into steps, validate each, and provide your verdict in JSON format.`;
}

export const BIPRM_R2L_SYSTEM_PROMPT = `You are an expert in backward (right-to-left) logical reasoning. Analyze claims by starting from the conclusion and tracing back to validate premises.

Respond in the following JSON format ONLY:
{
  "steps": [
    { "step": 1, "description": "<reasoning step>", "valid": true|false, "confidence": <0-1> },
    ...
  ],
  "verdict": "true" | "false" | "uncertain",
  "confidence": <number between 0 and 1>,
  "reasoning": "<overall conclusion>"
}

Instructions:
- Start from the claimed conclusion and work backwards
- For each step, verify the premises that would be required
- Check if those premises are actually true or established
- Mark each step as valid or invalid with a confidence score
- A claim is TRUE if all required premises are valid
- A claim is FALSE if required premises are missing or contradicted
- A claim is UNCERTAIN if some premises cannot be verified`;

export function createBiPRMR2LUserPrompt(
  content: string,
  context?: Record<string, unknown>
): string {
  return `Analyze this claim using BACKWARD reasoning (conclusion → premises):

<claim>
${content}
</claim>

${context ? `Additional context:\n${JSON.stringify(context, null, 2)}` : ''}

Start from the conclusion, trace back to premises, validate each, and provide your verdict in JSON format.`;
}

// Keep old BIPRM prompts for backward compatibility with tests
export const BIPRM_SYSTEM_PROMPT = BIPRM_L2R_SYSTEM_PROMPT;

export const BIPRM_USER_PROMPT = (content: string, context?: Record<string, unknown>) =>
  createBiPRML2RUserPrompt(content, context);

// =============================================================================
// TOOL-AUGMENTED PROMPTS — CLoVE
// =============================================================================

export const TOOL_CLOVE_SYSTEM_PROMPT = `You are a fact-verification assistant using Contrastive Local Verifiable Explanations (CLoVE). Analyze each source independently and provide contrastive reasoning.

Respond in the following JSON format ONLY:
{
  "verdict": "true" | "false" | "uncertain",
  "confidence": <number between 0 and 1>,
  "sources": [
    {
      "source_index": <number>,
      "supports": true|false,
      "relevance": <0-1>,
      "independent": true|false
    },
    ...
  ],
  "contrastive_plausibility": <0-1>,
  "reasoning": "<your analysis>"
}

Guidelines:
- Assess EACH source independently: does it support or contradict the claim?
- Rate relevance (0-1): how directly does this source address the claim?
- Mark independence: are sources truly independent, or do they cite the same origin?
- Contrastive test: "If the claim were FALSE, what would the evidence look like?"
  Set contrastive_plausibility to how plausible the false-world evidence scenario is (0=not at all, 1=very plausible)
- Higher confidence when multiple INDEPENDENT sources corroborate
- Lower confidence when sources share a common origin`;

export function createToolCLoVEUserPrompt(
  content: string,
  searchResults: string,
  context?: Record<string, unknown>
): string {
  return `Verify this claim using CLoVE analysis against the search results:

<claim>
${content}
</claim>

<search_results>
${searchResults}
</search_results>

${context ? `Additional context:\n${JSON.stringify(context, null, 2)}` : ''}

For each source:
1. Does it support or contradict the claim?
2. How relevant is it (0-1)?
3. Is it independent from other sources?

Then: If this claim were FALSE, what would the evidence look like? Rate the plausibility of that scenario.

Respond in JSON format.`;
}

// Keep old tool prompts for backward compatibility with tests
export const TOOL_SYSTEM_PROMPT = TOOL_CLOVE_SYSTEM_PROMPT;

export const TOOL_USER_PROMPT = (
  content: string,
  searchResults: string,
  context?: Record<string, unknown>
) => createToolCLoVEUserPrompt(content, searchResults, context);

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
// META-JUDGE PROMPTS (Ensemble adjudication)
// =============================================================================

export const META_JUDGE_SYSTEM_PROMPT = `You are a meta-judge adjudicating between multiple AI model assessments of a claim. Your role is to identify biases and reach the most accurate verdict.

Respond in the following JSON format ONLY:
{
  "verdict": "true" | "false" | "uncertain",
  "confidence": <number between 0 and 1>,
  "reasoning": "<your adjudication analysis>"
}

Watch for these biases in the member assessments:
- Verbosity bias: Longer reasoning doesn't mean better reasoning
- Agreement bias: Models may agree incorrectly due to shared training data
- Self-preference: Models may favor their own typical response patterns
- Anchoring: Earlier assessments may influence later ones

Your task:
1. Evaluate each member's reasoning quality (not just their verdict)
2. Consider the claim type when weighing assessments
3. Provide your independent adjudication`;

export function createMetaJudgeUserPrompt(
  claim: string,
  memberResults: Array<{
    member: { provider: string; model: string };
    verdict: string | null;
    confidence: number;
    reasoning: string | null;
  }>,
  claimType: string
): string {
  const memberSummaries = memberResults
    .filter((r) => r.verdict !== null)
    .map(
      (r, i) =>
        `<member_${i + 1} provider="${r.member.provider}" model="${r.member.model}">
Verdict: ${r.verdict}
Confidence: ${(r.confidence * 100).toFixed(0)}%
Reasoning: ${r.reasoning?.slice(0, 200) || 'No reasoning'}
</member_${i + 1}>`
    )
    .join('\n\n');

  return `Adjudicate between these model assessments:

<claim type="${claimType}">
${claim}
</claim>

${memberSummaries}

Consider the claim type (${claimType}) and each member's reasoning quality. Watch for biases. Provide your adjudication in JSON format.`;
}

// =============================================================================
// SEMANTIC ENTROPY PROMPTS
// =============================================================================

export const ENTROPY_SYSTEM_PROMPT = `You are a verdict classifier for semantic entropy analysis. You will be given a claim and multiple independent LLM responses about that claim. Your job is to:

1. Group semantically equivalent responses into clusters (responses that make the same core argument, even if worded differently)
2. Classify what verdict each response supports

Respond in the following JSON format ONLY:
{
  "verdicts": ["true" | "false" | "uncertain", ...],
  "clusters": [
    { "label": "<cluster description>", "count": <number of responses in cluster>, "response_indices": [<0-based indices>] },
    ...
  ],
  "reasoning": "<brief explanation of how you classified and clustered>"
}

Guidelines:
- Read each response carefully for its factual conclusion about the claim
- "true" = the response says the claim is accurate/correct/supported
- "false" = the response says the claim is inaccurate/incorrect/unsupported
- "uncertain" = the response is ambiguous, hedged, or does not take a clear position
- Return exactly one verdict per response, in the same order they were provided
- Group responses by semantic meaning, not just verdict label`;

export const ENTROPY_USER_PROMPT = (claim: string, responses: string[]) => {
  const numberedResponses = responses
    .map((r, i) => `<response_${i + 1}>\n${r}\n</response_${i + 1}>`)
    .join('\n\n');

  return `Classify the verdict and cluster these responses about this claim:

<claim>
${claim}
</claim>

${numberedResponses}

For each response, determine if it supports the claim as "true", "false", or "uncertain". Also group semantically equivalent responses. Respond in JSON format.`;
};

// =============================================================================
// LOGPROB ENTROPY PROMPT (Path A — single-call with logprobs)
// =============================================================================

export const LOGPROB_ENTROPY_SYSTEM_PROMPT = `You are a fact-checking assistant. Determine if the given claim is true, false, or uncertain.

Respond in the following JSON format ONLY:
{
  "verdict": "true" | "false" | "uncertain",
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>"
}

Be precise and direct. Your verdict token probabilities will be used for entropy analysis.`;

// =============================================================================
// FORMAL VERIFICATION PROMPTS
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
