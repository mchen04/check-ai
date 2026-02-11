/**
 * Tests for Entropy Verification Method (Dual-Path)
 * Tests logprob-based (Path A) and behavioral (Path B) entropy analysis,
 * including verdict extraction, entropy calculations, confidence capping,
 * fallback logic, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntropyParadigm, createEntropyParadigm } from './entropy';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockComplete = vi.fn();
const mockHasProvider = vi.fn().mockReturnValue(true);

vi.mock('@/lib/llm', () => ({
  LLMClient: class MockLLMClient {
    constructor() {}
    complete = mockComplete;
    hasProvider = mockHasProvider;
  },
  calculateCostCents: vi.fn().mockReturnValue(0.01),
}));

const mockGetModel = vi.fn();

vi.mock('@/lib/llm/model-registry', () => ({
  ModelRegistry: {
    getInstance: () => ({
      getModel: mockGetModel,
    }),
  },
}));

vi.mock('../prompts', () => ({
  ENTROPY_SYSTEM_PROMPT: 'mock-entropy-system-prompt',
  ENTROPY_USER_PROMPT: (claim: string, responses: string[]) =>
    `classify: ${claim} | ${responses.length} responses`,
  LOGPROB_ENTROPY_SYSTEM_PROMPT: 'mock-logprob-entropy-system-prompt',
}));

const mockSelectBestProvider = vi.fn().mockReturnValue('openai');
const mockGetDefaultModel = vi.fn().mockReturnValue('gpt-4');
const mockCreateParadigmErrorResult = vi.fn().mockImplementation(
  (paradigm, weight, provider, model, timeMs, error) => ({
    paradigm,
    weight,
    provider,
    model,
    verdict: null,
    confidence: 0,
    reasoning: null,
    processingTimeMs: timeMs,
    costCents: 0,
    error: error instanceof Error ? error.message : 'Unknown error',
  })
);
const mockNormalizeVerdict = vi.fn().mockImplementation((v: unknown) => {
  if (!v) return 'uncertain';
  const s = String(v).toLowerCase();
  if (s === 'true' || s === 'yes') return 'true';
  if (s === 'false' || s === 'no') return 'false';
  return 'uncertain';
});
const mockExtractJsonFromResponse = vi.fn().mockImplementation((response: string, fallback: unknown) => {
  try {
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    return JSON.parse(match[0]);
  } catch {
    return fallback;
  }
});

vi.mock('./shared', () => ({
  selectBestProvider: (...args: unknown[]) => mockSelectBestProvider(...args),
  getDefaultModel: (...args: unknown[]) => mockGetDefaultModel(...args),
  createParadigmErrorResult: (...args: unknown[]) => mockCreateParadigmErrorResult(...args),
  normalizeVerdict: (...args: unknown[]) => mockNormalizeVerdict(...args),
  extractJsonFromResponse: (...args: unknown[]) => mockExtractJsonFromResponse(...args),
}));

// =============================================================================
// HELPERS
// =============================================================================

function makeLLMResponse(overrides: Record<string, unknown> = {}) {
  return {
    content: '{"verdict": "true", "confidence": 0.9}',
    model: 'gpt-4',
    usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 },
    provider: 'openai',
    finishReason: 'stop',
    latencyMs: 50,
    ...overrides,
  };
}

function makeLogprobResponse(overrides: Record<string, unknown> = {}) {
  return makeLLMResponse({
    logprobs: [
      {
        token: '"true',
        logprob: -0.1,
        topLogprobs: [
          { token: '"true', logprob: -0.1 },
          { token: '"false', logprob: -2.5 },
          { token: '"uncertain', logprob: -4.0 },
        ],
      },
    ],
    ...overrides,
  });
}

function makeSampleResponse(content: string) {
  return makeLLMResponse({ content });
}

function makeClassificationResponse(
  verdicts: string[],
  reasoning: string,
  clusters?: Array<{ label: string; count: number }>
) {
  const obj: Record<string, unknown> = { verdicts, reasoning };
  if (clusters) obj.clusters = clusters;
  return makeLLMResponse({ content: JSON.stringify(obj) });
}

const DEFAULT_OPTIONS = { weight: 1.0 };
const DEFAULT_CONTEXT = {};
const CLAIM = 'The Earth revolves around the Sun';

// =============================================================================
// TESTS
// =============================================================================

describe('EntropyParadigm', () => {
  let paradigm: EntropyParadigm;

  beforeEach(() => {
    vi.clearAllMocks();
    paradigm = new EntropyParadigm({ openai: 'test-key' });
    // Default: registry returns a model with logprobs capability
    mockGetModel.mockReturnValue({
      id: 'gpt-4',
      provider: 'openai',
      capabilities: ['text', 'logprobs'],
    });
    mockSelectBestProvider.mockReturnValue('openai');
    mockGetDefaultModel.mockReturnValue('gpt-4');
  });

  // ===========================================================================
  // PATH A: LOGPROB-BASED ENTROPY
  // ===========================================================================

  describe('Path A — logprob-based entropy', () => {
    it('should extract verdict probabilities and calculate correct entropy', async () => {
      // logprobs: pTrue ~ e^-0.1 = 0.905, pFalse ~ e^-2.5 = 0.082, pUncertain ~ e^-4.0 = 0.018
      mockComplete.mockResolvedValueOnce(makeLogprobResponse());

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      expect(result.paradigm).toBe('entropy');
      expect(result.verdict).toBe('true');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
      expect(result.weight).toBe(1.0);
      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4');
      expect(result.reasoning).toContain('Path A');
      expect(result.reasoning).toContain('P(true)');
      expect(result.reasoning).toContain('Predictive Entropy');
      expect(result.costCents).toBeDefined();
      expect(result.tokenUsage).toBeDefined();
      expect(result.tokenUsage!.inputTokens).toBe(100);
      expect(result.tokenUsage!.outputTokens).toBe(20);

      // Only 1 LLM call for Path A
      expect(mockComplete).toHaveBeenCalledTimes(1);
      // Verify logprobs were requested
      const callArgs = mockComplete.mock.calls[0];
      expect(callArgs[2]).toMatchObject({
        logprobs: true,
        topLogprobs: 5,
      });
    });

    it('should determine verdict from highest probability', async () => {
      // Make pFalse the highest
      mockComplete.mockResolvedValueOnce(
        makeLogprobResponse({
          logprobs: [
            {
              token: '"false',
              logprob: -0.05,
              topLogprobs: [
                { token: '"false', logprob: -0.05 },
                { token: '"true', logprob: -3.0 },
                { token: '"uncertain', logprob: -5.0 },
              ],
            },
          ],
        })
      );

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      expect(result.verdict).toBe('false');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should cap confidence at 0.5 when verdict is uncertain', async () => {
      // Make pUncertain highest
      mockComplete.mockResolvedValueOnce(
        makeLogprobResponse({
          logprobs: [
            {
              token: '"uncertain',
              logprob: -0.05,
              topLogprobs: [
                { token: '"uncertain', logprob: -0.05 },
                { token: '"true', logprob: -3.0 },
                { token: '"false', logprob: -3.5 },
              ],
            },
          ],
        })
      );

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      expect(result.verdict).toBe('uncertain');
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });

    it('should fall through to Path B when logprobs are not in response', async () => {
      // No logprobs field in the response
      mockComplete.mockResolvedValueOnce(makeLLMResponse({ logprobs: undefined }));

      // Set up Path B mocks (5 samples + 1 classification)
      const sampleResponses = Array(5).fill(null).map(() =>
        makeSampleResponse('This is true because the Earth orbits the Sun.')
      );
      sampleResponses.forEach((r) => mockComplete.mockResolvedValueOnce(r));

      mockComplete.mockResolvedValueOnce(
        makeClassificationResponse(
          ['true', 'true', 'true', 'true', 'true'],
          'All samples agree',
          [{ label: 'affirm', count: 5 }]
        )
      );

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      expect(result.verdict).toBe('true');
      expect(result.reasoning).toContain('Path B');
      // 1 (failed logprob) + 5 (samples) + 1 (classification) = 7
      expect(mockComplete).toHaveBeenCalledTimes(7);
    });

    it('should fall through to Path B when logprob extraction fails (no verdict tokens)', async () => {
      // Logprobs present but no verdict tokens found
      mockComplete.mockResolvedValueOnce(
        makeLogprobResponse({
          logprobs: [
            {
              token: 'The',
              logprob: -0.5,
              topLogprobs: [
                { token: 'The', logprob: -0.5 },
                { token: 'A', logprob: -1.0 },
              ],
            },
          ],
        })
      );

      // Path B mocks
      const sampleResponses = Array(5).fill(null).map(() =>
        makeSampleResponse('True, the Earth revolves around the Sun.')
      );
      sampleResponses.forEach((r) => mockComplete.mockResolvedValueOnce(r));

      mockComplete.mockResolvedValueOnce(
        makeClassificationResponse(
          ['true', 'true', 'true', 'true', 'true'],
          'Unanimous agreement',
          [{ label: 'affirm', count: 5 }]
        )
      );

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      expect(result.verdict).toBe('true');
      expect(result.reasoning).toContain('Path B');
    });

    it('should fall through to Path B when Path A throws an error', async () => {
      // First call (logprob attempt) rejects
      mockComplete.mockRejectedValueOnce(new Error('Logprobs not supported'));

      // Path B mocks
      const sampleResponses = Array(5).fill(null).map(() =>
        makeSampleResponse('The claim is false.')
      );
      sampleResponses.forEach((r) => mockComplete.mockResolvedValueOnce(r));

      mockComplete.mockResolvedValueOnce(
        makeClassificationResponse(
          ['false', 'false', 'false', 'false', 'false'],
          'All samples disagree with the claim',
          [{ label: 'deny', count: 5 }]
        )
      );

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      expect(result.verdict).toBe('false');
      expect(result.reasoning).toContain('Path B');
    });
  });

  // ===========================================================================
  // PATH A: PROVIDER LOGPROB SUPPORT CHECK
  // ===========================================================================

  describe('Path A — provider logprob support', () => {
    it('should skip Path A and go directly to Path B when provider does not support logprobs', async () => {
      // Registry returns model without logprobs capability
      mockGetModel.mockReturnValue({
        id: 'claude-3-opus',
        provider: 'anthropic',
        capabilities: ['text', 'tool_use'],
      });

      // Path B mocks
      const sampleResponses = Array(5).fill(null).map(() =>
        makeSampleResponse('True, confirmed.')
      );
      sampleResponses.forEach((r) => mockComplete.mockResolvedValueOnce(r));

      mockComplete.mockResolvedValueOnce(
        makeClassificationResponse(
          ['true', 'true', 'true', 'true', 'true'],
          'Unanimous',
          [{ label: 'affirm', count: 5 }]
        )
      );

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, {
        ...DEFAULT_OPTIONS,
        provider: 'anthropic',
        model: 'claude-3-opus',
      });

      expect(result.verdict).toBe('true');
      expect(result.reasoning).toContain('Path B');
      // No logprob call attempted, just 5 samples + 1 classification
      expect(mockComplete).toHaveBeenCalledTimes(6);
    });

    it('should fall back to known set when model is not in registry', async () => {
      // Model not found in registry, but provider is in known logprob set (openai)
      mockGetModel.mockReturnValue(null);
      mockComplete.mockResolvedValueOnce(makeLogprobResponse());

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      expect(result.verdict).toBe('true');
      expect(result.reasoning).toContain('Path A');
      expect(mockComplete).toHaveBeenCalledTimes(1);
    });

    it('should skip logprobs for unknown model on non-logprob provider', async () => {
      // Model not in registry, provider not in known set
      mockGetModel.mockReturnValue(null);
      mockSelectBestProvider.mockReturnValue('anthropic');
      mockGetDefaultModel.mockReturnValue('claude-3-opus');

      // Path B mocks
      const sampleResponses = Array(5).fill(null).map(() =>
        makeSampleResponse('True.')
      );
      sampleResponses.forEach((r) => mockComplete.mockResolvedValueOnce(r));

      mockComplete.mockResolvedValueOnce(
        makeClassificationResponse(
          ['true', 'true', 'true', 'true', 'true'],
          'All agree',
          [{ label: 'affirm', count: 5 }]
        )
      );

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, {
        ...DEFAULT_OPTIONS,
        provider: 'anthropic',
        model: 'claude-3-opus',
      });

      expect(result.reasoning).toContain('Path B');
      expect(mockComplete).toHaveBeenCalledTimes(6);
    });
  });

  // ===========================================================================
  // PATH B: BEHAVIORAL ENTROPY
  // ===========================================================================

  describe('Path B — behavioral entropy', () => {
    beforeEach(() => {
      // Force Path B by making provider not support logprobs
      mockGetModel.mockReturnValue({
        id: 'claude-3-opus',
        provider: 'anthropic',
        capabilities: ['text'],
      });
      mockSelectBestProvider.mockReturnValue('anthropic');
      mockGetDefaultModel.mockReturnValue('claude-3-opus');
    });

    it('should produce low entropy and high confidence for unanimous samples', async () => {
      const sampleResponses = Array(5).fill(null).map(() =>
        makeSampleResponse('True, this is scientifically verified.')
      );
      sampleResponses.forEach((r) => mockComplete.mockResolvedValueOnce(r));

      mockComplete.mockResolvedValueOnce(
        makeClassificationResponse(
          ['true', 'true', 'true', 'true', 'true'],
          'All samples unanimously agree the claim is true',
          [{ label: 'scientific affirmation', count: 5 }]
        )
      );

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, {
        ...DEFAULT_OPTIONS,
        provider: 'anthropic',
        model: 'claude-3-opus',
      });

      expect(result.verdict).toBe('true');
      // Unanimous verdicts + single cluster => zero entropy => confidence = 1.0
      expect(result.confidence).toBeCloseTo(1.0, 1);
      expect(result.reasoning).toContain('Path B');
      expect(result.reasoning).toContain('Verdict Entropy');
      expect(result.reasoning).toContain('Semantic Cluster Entropy');
      expect(result.reasoning).toContain('True: 5');
    });

    it('should produce higher entropy and lower confidence for mixed samples', async () => {
      const sampleResponses = Array(5).fill(null).map(() =>
        makeSampleResponse('Varied response')
      );
      sampleResponses.forEach((r) => mockComplete.mockResolvedValueOnce(r));

      mockComplete.mockResolvedValueOnce(
        makeClassificationResponse(
          ['true', 'true', 'true', 'false', 'uncertain'],
          'Most samples agree but with some disagreement',
          [
            { label: 'affirm', count: 3 },
            { label: 'deny', count: 1 },
            { label: 'hedge', count: 1 },
          ]
        )
      );

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, {
        ...DEFAULT_OPTIONS,
        provider: 'anthropic',
        model: 'claude-3-opus',
      });

      expect(result.verdict).toBe('true');
      // Mixed verdicts => non-zero entropy => confidence < 1.0
      expect(result.confidence).toBeLessThan(1.0);
      expect(result.confidence).toBeGreaterThan(0.0);
      expect(result.reasoning).toContain('True: 3');
      expect(result.reasoning).toContain('False: 1');
      expect(result.reasoning).toContain('Uncertain: 1');
    });

    it('should cap confidence at 0.5 when all samples are uncertain', async () => {
      const sampleResponses = Array(5).fill(null).map(() =>
        makeSampleResponse('I am not sure about this claim.')
      );
      sampleResponses.forEach((r) => mockComplete.mockResolvedValueOnce(r));

      mockComplete.mockResolvedValueOnce(
        makeClassificationResponse(
          ['uncertain', 'uncertain', 'uncertain', 'uncertain', 'uncertain'],
          'All samples are hedged or uncertain',
          [{ label: 'hedging', count: 5 }]
        )
      );

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, {
        ...DEFAULT_OPTIONS,
        provider: 'anthropic',
        model: 'claude-3-opus',
      });

      expect(result.verdict).toBe('uncertain');
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });

    it('should return error result when no samples are generated', async () => {
      // All 5 sample calls reject
      for (let i = 0; i < 5; i++) {
        mockComplete.mockRejectedValueOnce(new Error('API timeout'));
      }

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, {
        ...DEFAULT_OPTIONS,
        provider: 'anthropic',
        model: 'claude-3-opus',
      });

      expect(result.verdict).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.error).toContain('No samples generated');
    });

    it('should incorporate semantic clusters into confidence calculation', async () => {
      const sampleResponses = Array(5).fill(null).map(() =>
        makeSampleResponse('Response about the claim')
      );
      sampleResponses.forEach((r) => mockComplete.mockResolvedValueOnce(r));

      // 2 clusters with uneven distribution
      mockComplete.mockResolvedValueOnce(
        makeClassificationResponse(
          ['true', 'true', 'true', 'true', 'false'],
          'Most agree, one dissents',
          [
            { label: 'affirm', count: 4 },
            { label: 'deny', count: 1 },
          ]
        )
      );

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, {
        ...DEFAULT_OPTIONS,
        provider: 'anthropic',
        model: 'claude-3-opus',
      });

      expect(result.verdict).toBe('true');
      // 2 clusters (4/5, 1/5) has entropy ~0.72 bits
      // H_verdict (4 true, 1 false) ~0.72 bits
      // Combined: 0.6*0.72 + 0.4*0.72 = 0.72
      // confidence = 1 - 0.72/log2(3) = 1 - 0.72/1.585 ~ 0.546
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.confidence).toBeLessThan(0.8);
      expect(result.reasoning).toContain('Semantic Clusters: 2');
    });

    it('should use verdict entropy as fallback when no clusters returned', async () => {
      const sampleResponses = Array(5).fill(null).map(() =>
        makeSampleResponse('Response')
      );
      sampleResponses.forEach((r) => mockComplete.mockResolvedValueOnce(r));

      // No clusters in classification response
      mockComplete.mockResolvedValueOnce(
        makeClassificationResponse(
          ['true', 'true', 'false', 'false', 'true'],
          'Mixed results'
          // no clusters parameter
        )
      );

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, {
        ...DEFAULT_OPTIONS,
        provider: 'anthropic',
        model: 'claude-3-opus',
      });

      expect(result.verdict).toBe('true');
      // Without clusters, semanticEntropy = verdictEntropy
      // Combined = 0.6 * H + 0.4 * H = H
      // 3 true, 2 false: H = -(3/5*log2(3/5) + 2/5*log2(2/5)) ~ 0.971
      // confidence = 1 - 0.971/1.585 ~ 0.387
      expect(result.confidence).toBeGreaterThan(0.2);
      expect(result.confidence).toBeLessThan(0.6);
    });

    it('should aggregate token usage from samples and classification', async () => {
      const sampleResponses = Array(5).fill(null).map(() =>
        makeLLMResponse({
          content: 'Sample response',
          usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 },
        })
      );
      sampleResponses.forEach((r) => mockComplete.mockResolvedValueOnce(r));

      mockComplete.mockResolvedValueOnce(
        makeLLMResponse({
          content: JSON.stringify({
            verdicts: ['true', 'true', 'true', 'true', 'true'],
            reasoning: 'All agree',
            clusters: [{ label: 'affirm', count: 5 }],
          }),
          usage: { inputTokens: 200, outputTokens: 100, totalTokens: 300 },
        })
      );

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, {
        ...DEFAULT_OPTIONS,
        provider: 'anthropic',
        model: 'claude-3-opus',
      });

      // 5 samples * 50 input + 200 classification = 450 input
      // 5 samples * 30 output + 100 classification = 250 output
      expect(result.tokenUsage).toBeDefined();
      expect(result.tokenUsage!.inputTokens).toBe(450);
      expect(result.tokenUsage!.outputTokens).toBe(250);
    });

    it('should handle partial sample failures gracefully', async () => {
      // 3 succeed, 2 fail
      mockComplete.mockResolvedValueOnce(makeSampleResponse('True.'));
      mockComplete.mockRejectedValueOnce(new Error('timeout'));
      mockComplete.mockResolvedValueOnce(makeSampleResponse('True.'));
      mockComplete.mockRejectedValueOnce(new Error('timeout'));
      mockComplete.mockResolvedValueOnce(makeSampleResponse('True.'));

      // Classification for the 3 that succeeded
      mockComplete.mockResolvedValueOnce(
        makeClassificationResponse(
          ['true', 'true', 'true'],
          'All successful samples agree',
          [{ label: 'affirm', count: 3 }]
        )
      );

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, {
        ...DEFAULT_OPTIONS,
        provider: 'anthropic',
        model: 'claude-3-opus',
      });

      expect(result.verdict).toBe('true');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning).toContain('3 samples');
    });

    it('should determine false verdict by majority vote', async () => {
      const sampleResponses = Array(5).fill(null).map(() =>
        makeSampleResponse('The claim seems inaccurate')
      );
      sampleResponses.forEach((r) => mockComplete.mockResolvedValueOnce(r));

      mockComplete.mockResolvedValueOnce(
        makeClassificationResponse(
          ['false', 'false', 'false', 'true', 'false'],
          'Most samples find the claim false',
          [
            { label: 'deny', count: 4 },
            { label: 'affirm', count: 1 },
          ]
        )
      );

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, {
        ...DEFAULT_OPTIONS,
        provider: 'anthropic',
        model: 'claude-3-opus',
      });

      expect(result.verdict).toBe('false');
    });
  });

  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================

  describe('Error handling', () => {
    it('should return error result when entire execution throws', async () => {
      // Force logprobs to be unsupported so we go to Path B
      mockGetModel.mockReturnValue({
        id: 'claude-3-opus',
        provider: 'anthropic',
        capabilities: ['text'],
      });

      // Path B: generateSamples succeeds but classifyVerdicts throws
      const sampleResponses = Array(5).fill(null).map(() =>
        makeSampleResponse('True.')
      );
      sampleResponses.forEach((r) => mockComplete.mockResolvedValueOnce(r));

      // Classification call throws
      mockComplete.mockRejectedValueOnce(new Error('Classification API failure'));

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, {
        ...DEFAULT_OPTIONS,
        provider: 'anthropic',
        model: 'claude-3-opus',
      });

      expect(result.verdict).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.error).toContain('Classification API failure');
    });

    it('should return error result when provider/model options are invalid', async () => {
      mockGetModel.mockReturnValue(null);

      // Both Path A and Path B fail
      mockComplete.mockRejectedValue(new Error('Invalid provider'));

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      expect(result.verdict).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.error).toBeDefined();
    });
  });

  // ===========================================================================
  // PARADIGM IDENTITY & FACTORY
  // ===========================================================================

  describe('Paradigm identity', () => {
    it('should have name property set to entropy', () => {
      expect(paradigm.name).toBe('entropy');
    });

    it('should include all required fields in result', async () => {
      mockComplete.mockResolvedValueOnce(makeLogprobResponse());

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, { weight: 0.75 });

      expect(result).toHaveProperty('paradigm', 'entropy');
      expect(result).toHaveProperty('weight', 0.75);
      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('verdict');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('processingTimeMs');
      expect(result).toHaveProperty('costCents');
    });

    it('should use selectBestProvider when no provider specified', async () => {
      mockComplete.mockResolvedValueOnce(makeLogprobResponse());

      await paradigm.execute(CLAIM, DEFAULT_CONTEXT, { weight: 1.0 });

      expect(mockSelectBestProvider).toHaveBeenCalled();
    });

    it('should use provided provider/model when specified', async () => {
      mockGetModel.mockReturnValue({
        id: 'gpt-4',
        provider: 'openai',
        capabilities: ['text', 'logprobs'],
      });

      mockComplete.mockResolvedValueOnce(makeLogprobResponse());

      const result = await paradigm.execute(CLAIM, DEFAULT_CONTEXT, {
        weight: 1.0,
        provider: 'openai',
        model: 'gpt-4',
      });

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4');
    });
  });
});

describe('createEntropyParadigm factory', () => {
  it('should create an EntropyParadigm instance', () => {
    const paradigm = createEntropyParadigm({ openai: 'test-key' });

    expect(paradigm).toBeInstanceOf(EntropyParadigm);
    expect(paradigm.name).toBe('entropy');
  });

  it('should accept multiple provider keys', () => {
    const paradigm = createEntropyParadigm({
      openai: 'test-openai',
      anthropic: 'test-anthropic',
      google: 'test-google',
    });

    expect(paradigm).toBeInstanceOf(EntropyParadigm);
  });
});
