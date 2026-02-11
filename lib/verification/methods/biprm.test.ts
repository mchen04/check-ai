/**
 * Tests for BiPRM (Bidirectional Reasoning) Verification Method
 * Tests parallel L2R/R2L execution, step scoring, bidirectional consistency,
 * and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BiPRMParadigm, createBiPRMParadigm } from './biprm';

// =============================================================================
// MOCKS
// =============================================================================

const mockComplete = vi.fn();

vi.mock('@/lib/llm', () => ({
  LLMClient: class MockLLMClient {
    constructor() {}
    complete = mockComplete;
    hasProvider = vi.fn().mockReturnValue(true);
  },
  calculateCostCents: vi.fn().mockReturnValue(0.01),
}));

vi.mock('../prompts', () => ({
  BIPRM_L2R_SYSTEM_PROMPT: 'L2R system prompt',
  createBiPRML2RUserPrompt: vi.fn().mockReturnValue('L2R user prompt'),
  BIPRM_R2L_SYSTEM_PROMPT: 'R2L system prompt',
  createBiPRMR2LUserPrompt: vi.fn().mockReturnValue('R2L user prompt'),
}));

vi.mock('./shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./shared')>();
  return {
    ...actual,
    selectBestProvider: vi.fn().mockReturnValue('openai'),
    getDefaultModel: vi.fn().mockReturnValue('gpt-4o'),
  };
});

vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// =============================================================================
// HELPERS
// =============================================================================

function makeLLMResponse(content: string) {
  return {
    content,
    model: 'gpt-4o',
    usage: { inputTokens: 100, outputTokens: 50 },
  };
}

function makeDirectionalJson(opts: {
  steps: Array<{ step: number; description: string; valid: boolean; confidence: number }>;
  verdict: string;
  confidence: number;
  reasoning?: string;
}) {
  return JSON.stringify({
    steps: opts.steps,
    verdict: opts.verdict,
    confidence: opts.confidence,
    reasoning: opts.reasoning ?? 'Test reasoning',
  });
}

const HIGH_CONFIDENCE_TRUE_STEPS = [
  { step: 1, description: 'First step', valid: true, confidence: 0.9 },
  { step: 2, description: 'Second step', valid: true, confidence: 0.85 },
];

const HIGH_CONFIDENCE_FALSE_STEPS = [
  { step: 1, description: 'First step', valid: true, confidence: 0.8 },
  { step: 2, description: 'Second step', valid: false, confidence: 0.9 },
];

// =============================================================================
// TESTS
// =============================================================================

describe('BiPRMParadigm', () => {
  let paradigm: BiPRMParadigm;

  beforeEach(() => {
    vi.clearAllMocks();
    paradigm = new BiPRMParadigm({ openai: 'test-key' });
  });

  describe('Paradigm Identity', () => {
    it('should have name set to biprm', () => {
      expect(paradigm.name).toBe('biprm');
    });
  });

  describe('Both directions agree TRUE', () => {
    it('should return true verdict with boosted confidence (geometric mean * 1.1)', async () => {
      const l2rJson = makeDirectionalJson({
        steps: HIGH_CONFIDENCE_TRUE_STEPS,
        verdict: 'true',
        confidence: 0.9,
      });
      const r2lJson = makeDirectionalJson({
        steps: HIGH_CONFIDENCE_TRUE_STEPS,
        verdict: 'true',
        confidence: 0.88,
      });

      mockComplete
        .mockResolvedValueOnce(makeLLMResponse(l2rJson))
        .mockResolvedValueOnce(makeLLMResponse(r2lJson));

      const result = await paradigm.execute('Test claim', {}, { weight: 1.0 });

      expect(result.verdict).toBe('true');
      expect(result.paradigm).toBe('biprm');

      // Both verdicts are "true", steps all valid:
      // L2R stepScore = min(0.9, 0.85) = 0.85
      // R2L stepScore = min(0.9, 0.85) = 0.85
      // l2rScore = stepScore = 0.85 (true verdict)
      // r2lScore = stepScore = 0.85 (true verdict)
      // confidence = min(sqrt(0.85 * 0.85) * 1.1, 1.0) = min(0.85 * 1.1, 1.0) = min(0.935, 1.0) = 0.935
      expect(result.confidence).toBeCloseTo(0.935, 2);
    });
  });

  describe('Both directions agree FALSE', () => {
    it('should return false verdict with boosted confidence', async () => {
      const l2rJson = makeDirectionalJson({
        steps: HIGH_CONFIDENCE_FALSE_STEPS,
        verdict: 'false',
        confidence: 0.85,
      });
      const r2lJson = makeDirectionalJson({
        steps: HIGH_CONFIDENCE_FALSE_STEPS,
        verdict: 'false',
        confidence: 0.8,
      });

      mockComplete
        .mockResolvedValueOnce(makeLLMResponse(l2rJson))
        .mockResolvedValueOnce(makeLLMResponse(r2lJson));

      const result = await paradigm.execute('False claim', {}, { weight: 1.0 });

      expect(result.verdict).toBe('false');

      // Both verdicts are "false":
      // L2R steps: min(0.8, 0.9*0.3) = min(0.8, 0.27) = 0.27
      // l2rScore = 1 - 0.27 = 0.73 (false verdict → 1 - stepScore)
      // R2L steps: same → 0.27, r2lScore = 1 - 0.27 = 0.73
      // confidence = min(sqrt(0.73 * 0.73) * 1.1, 1.0) = min(0.73 * 1.1, 1.0) = 0.803
      expect(result.confidence).toBeCloseTo(0.803, 2);
    });
  });

  describe('Disagreement (L2R=true, R2L=false)', () => {
    it('should use the stronger direction and cap at 0.7', async () => {
      const l2rJson = makeDirectionalJson({
        steps: HIGH_CONFIDENCE_TRUE_STEPS,
        verdict: 'true',
        confidence: 0.9,
      });
      const r2lJson = makeDirectionalJson({
        steps: HIGH_CONFIDENCE_FALSE_STEPS,
        verdict: 'false',
        confidence: 0.8,
      });

      mockComplete
        .mockResolvedValueOnce(makeLLMResponse(l2rJson))
        .mockResolvedValueOnce(makeLLMResponse(r2lJson));

      const result = await paradigm.execute('Disputed claim', {}, { weight: 1.0 });

      // L2R: true, stepScore = min(0.9, 0.85) = 0.85, l2rScore = 0.85
      // R2L: false, stepScore = min(0.8, 0.9*0.3=0.27) = 0.27, r2lScore = 1 - 0.27 = 0.73
      // l2rScore(0.85) > r2lScore(0.73), so verdict = L2R verdict = 'true'
      // confidence = min(max(0.85, 0.73), 0.7) = min(0.85, 0.7) = 0.7
      expect(result.verdict).toBe('true');
      expect(result.confidence).toBe(0.7);
    });
  });

  describe('One uncertain direction', () => {
    it('should use the non-uncertain verdict with 0.85 scaling', async () => {
      const l2rJson = makeDirectionalJson({
        steps: HIGH_CONFIDENCE_TRUE_STEPS,
        verdict: 'true',
        confidence: 0.9,
      });
      const r2lJson = makeDirectionalJson({
        steps: [
          { step: 1, description: 'Unclear step', valid: true, confidence: 0.5 },
        ],
        verdict: 'uncertain',
        confidence: 0.5,
      });

      mockComplete
        .mockResolvedValueOnce(makeLLMResponse(l2rJson))
        .mockResolvedValueOnce(makeLLMResponse(r2lJson));

      const result = await paradigm.execute('Partial claim', {}, { weight: 1.0 });

      // L2R: true, stepScore = min(0.9, 0.85) = 0.85, l2rScore = 0.85
      // R2L: uncertain, stepScore = 0.5, r2lScore = confidence = 0.5
      // One uncertain → verdict = L2R (non-uncertain) = 'true'
      // confidence = max(0.85, 0.5) * 0.85 = 0.85 * 0.85 = 0.7225
      expect(result.verdict).toBe('true');
      expect(result.confidence).toBeCloseTo(0.7225, 3);
    });
  });

  describe('Both uncertain', () => {
    it('should return uncertain with low confidence capped at 0.5', async () => {
      const l2rJson = makeDirectionalJson({
        steps: [
          { step: 1, description: 'Unclear', valid: true, confidence: 0.5 },
        ],
        verdict: 'uncertain',
        confidence: 0.5,
      });
      const r2lJson = makeDirectionalJson({
        steps: [
          { step: 1, description: 'Also unclear', valid: true, confidence: 0.4 },
        ],
        verdict: 'uncertain',
        confidence: 0.4,
      });

      mockComplete
        .mockResolvedValueOnce(makeLLMResponse(l2rJson))
        .mockResolvedValueOnce(makeLLMResponse(r2lJson));

      const result = await paradigm.execute('Vague claim', {}, { weight: 1.0 });

      // Both uncertain:
      // L2R: uncertain, stepScore = 0.5, l2rScore = confidence = 0.5
      // R2L: uncertain, stepScore = 0.4, r2lScore = confidence = 0.4
      // verdict = uncertain (both fall through to uncertain)
      // confidence = min((0.5 + 0.4) / 2, 0.5) = min(0.45, 0.5) = 0.45
      expect(result.verdict).toBe('uncertain');
      expect(result.confidence).toBeCloseTo(0.45, 2);
    });
  });

  describe('Step with invalid entry (0.3 penalty)', () => {
    it('should apply 0.3 multiplier to invalid step confidence in step score', async () => {
      const stepsWithInvalid = [
        { step: 1, description: 'Valid step', valid: true, confidence: 0.9 },
        { step: 2, description: 'Invalid step', valid: false, confidence: 0.8 },
        { step: 3, description: 'Another valid step', valid: true, confidence: 0.95 },
      ];

      const l2rJson = makeDirectionalJson({
        steps: stepsWithInvalid,
        verdict: 'false',
        confidence: 0.85,
      });
      const r2lJson = makeDirectionalJson({
        steps: stepsWithInvalid,
        verdict: 'false',
        confidence: 0.8,
      });

      mockComplete
        .mockResolvedValueOnce(makeLLMResponse(l2rJson))
        .mockResolvedValueOnce(makeLLMResponse(r2lJson));

      const result = await paradigm.execute('Claim with bad step', {}, { weight: 1.0 });

      // Step scores: valid(0.9), invalid(0.8*0.3=0.24), valid(0.95)
      // stepScore = min(0.9, 0.24, 0.95) = 0.24
      // Both verdict false → score = 1 - 0.24 = 0.76
      // Agreement: confidence = min(sqrt(0.76 * 0.76) * 1.1, 1.0) = min(0.76 * 1.1, 1.0) = 0.836
      expect(result.verdict).toBe('false');
      expect(result.confidence).toBeCloseTo(0.836, 2);
    });
  });

  describe('No steps parsed (empty steps array)', () => {
    it('should fall back to directional confidence', async () => {
      // Return valid JSON but with no steps array
      const l2rJson = JSON.stringify({
        verdict: 'true',
        confidence: 0.8,
        reasoning: 'No steps provided',
      });
      const r2lJson = JSON.stringify({
        verdict: 'true',
        confidence: 0.75,
        reasoning: 'No steps provided',
      });

      mockComplete
        .mockResolvedValueOnce(makeLLMResponse(l2rJson))
        .mockResolvedValueOnce(makeLLMResponse(r2lJson));

      const result = await paradigm.execute('Stepless claim', {}, { weight: 1.0 });

      // No steps → stepScore fallback:
      // l2rParsed.steps.length === 0, so l2rStepScore = l2rParsed.confidence = 0.8
      // r2lParsed.steps.length === 0, so r2lStepScore = r2lParsed.confidence = 0.75
      // Both true → l2rScore = 0.8, r2lScore = 0.75
      // Agreement: confidence = min(sqrt(0.8 * 0.75) * 1.1, 1.0)
      //   = min(sqrt(0.6) * 1.1, 1.0) = min(0.7746 * 1.1, 1.0) = min(0.8520, 1.0)
      expect(result.verdict).toBe('true');
      expect(result.confidence).toBeCloseTo(Math.min(Math.sqrt(0.8 * 0.75) * 1.1, 1.0), 2);
    });
  });

  describe('Error handling', () => {
    it('should return error result when LLM calls fail', async () => {
      mockComplete.mockRejectedValue(new Error('LLM service unavailable'));

      const result = await paradigm.execute('Failing claim', {}, { weight: 1.0 });

      expect(result.paradigm).toBe('biprm');
      expect(result.verdict).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('LLM service unavailable');
      expect(result.reasoning).toBeNull();
    });

    it('should return error result when only one call fails (Promise.all rejects)', async () => {
      const l2rJson = makeDirectionalJson({
        steps: HIGH_CONFIDENCE_TRUE_STEPS,
        verdict: 'true',
        confidence: 0.9,
      });

      mockComplete
        .mockResolvedValueOnce(makeLLMResponse(l2rJson))
        .mockRejectedValueOnce(new Error('R2L timeout'));

      const result = await paradigm.execute('Half-failing claim', {}, { weight: 1.0 });

      expect(result.verdict).toBeNull();
      expect(result.error).toBe('R2L timeout');
    });
  });

  describe('Parallel execution', () => {
    it('should make exactly two LLM complete() calls', async () => {
      const json = makeDirectionalJson({
        steps: HIGH_CONFIDENCE_TRUE_STEPS,
        verdict: 'true',
        confidence: 0.9,
      });

      mockComplete
        .mockResolvedValueOnce(makeLLMResponse(json))
        .mockResolvedValueOnce(makeLLMResponse(json));

      await paradigm.execute('Any claim', {}, { weight: 1.0 });

      expect(mockComplete).toHaveBeenCalledTimes(2);
    });

    it('should pass L2R system prompt for first call and R2L for second', async () => {
      const json = makeDirectionalJson({
        steps: HIGH_CONFIDENCE_TRUE_STEPS,
        verdict: 'true',
        confidence: 0.9,
      });

      mockComplete
        .mockResolvedValueOnce(makeLLMResponse(json))
        .mockResolvedValueOnce(makeLLMResponse(json));

      await paradigm.execute('Any claim', {}, { weight: 1.0 });

      // First call — L2R
      const firstCallMessages = mockComplete.mock.calls[0][1];
      expect(firstCallMessages[0].content).toBe('L2R system prompt');

      // Second call — R2L
      const secondCallMessages = mockComplete.mock.calls[1][1];
      expect(secondCallMessages[0].content).toBe('R2L system prompt');
    });
  });

  describe('Result structure', () => {
    it('should include all required ParadigmResult fields', async () => {
      const json = makeDirectionalJson({
        steps: HIGH_CONFIDENCE_TRUE_STEPS,
        verdict: 'true',
        confidence: 0.9,
      });

      mockComplete
        .mockResolvedValueOnce(makeLLMResponse(json))
        .mockResolvedValueOnce(makeLLMResponse(json));

      const result = await paradigm.execute('Claim', {}, { weight: 0.8 });

      expect(result).toHaveProperty('paradigm', 'biprm');
      expect(result).toHaveProperty('weight', 0.8);
      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('model', 'gpt-4o');
      expect(result).toHaveProperty('verdict');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('processingTimeMs');
      expect(result).toHaveProperty('costCents');
      expect(result).toHaveProperty('tokenUsage');
      expect(result.tokenUsage).toEqual({
        inputTokens: 200,
        outputTokens: 100,
      });
    });

    it('should aggregate token usage from both directional calls', async () => {
      const json = makeDirectionalJson({
        steps: HIGH_CONFIDENCE_TRUE_STEPS,
        verdict: 'true',
        confidence: 0.9,
      });

      mockComplete
        .mockResolvedValueOnce({
          content: json,
          model: 'gpt-4o',
          usage: { inputTokens: 150, outputTokens: 80 },
        })
        .mockResolvedValueOnce({
          content: json,
          model: 'gpt-4o',
          usage: { inputTokens: 160, outputTokens: 90 },
        });

      const result = await paradigm.execute('Claim', {}, { weight: 1.0 });

      expect(result.tokenUsage).toEqual({
        inputTokens: 310,
        outputTokens: 170,
      });
    });

    it('should contain reasoning with L2R and R2L analysis sections', async () => {
      const json = makeDirectionalJson({
        steps: HIGH_CONFIDENCE_TRUE_STEPS,
        verdict: 'true',
        confidence: 0.9,
      });

      mockComplete
        .mockResolvedValueOnce(makeLLMResponse(json))
        .mockResolvedValueOnce(makeLLMResponse(json));

      const result = await paradigm.execute('Claim', {}, { weight: 1.0 });

      expect(result.reasoning).toContain('FORWARD (L2R) ANALYSIS');
      expect(result.reasoning).toContain('BACKWARD (R2L) ANALYSIS');
      expect(result.reasoning).toContain('CONSISTENCY');
    });
  });

  describe('Disagreement with R2L stronger', () => {
    it('should pick R2L verdict when R2L score is higher', async () => {
      // L2R says false with low-quality steps, R2L says true with high-quality steps
      const l2rJson = makeDirectionalJson({
        steps: [
          { step: 1, description: 'Weak step', valid: false, confidence: 0.5 },
        ],
        verdict: 'false',
        confidence: 0.6,
      });
      const r2lJson = makeDirectionalJson({
        steps: [
          { step: 1, description: 'Strong step', valid: true, confidence: 0.95 },
        ],
        verdict: 'true',
        confidence: 0.9,
      });

      mockComplete
        .mockResolvedValueOnce(makeLLMResponse(l2rJson))
        .mockResolvedValueOnce(makeLLMResponse(r2lJson));

      const result = await paradigm.execute('R2L wins claim', {}, { weight: 1.0 });

      // L2R: false, stepScore = 0.5*0.3 = 0.15, l2rScore = 1 - 0.15 = 0.85
      // R2L: true, stepScore = 0.95, r2lScore = 0.95
      // r2lScore(0.95) > l2rScore(0.85) → verdict = 'true'
      // confidence = min(max(0.85, 0.95), 0.7) = 0.7
      expect(result.verdict).toBe('true');
      expect(result.confidence).toBe(0.7);
    });
  });

  describe('Agreement confidence cap at 1.0', () => {
    it('should cap confidence at 1.0 when geometric mean * 1.1 exceeds 1.0', async () => {
      const highSteps = [
        { step: 1, description: 'Perfect step', valid: true, confidence: 0.99 },
      ];

      const l2rJson = makeDirectionalJson({
        steps: highSteps,
        verdict: 'true',
        confidence: 0.99,
      });
      const r2lJson = makeDirectionalJson({
        steps: highSteps,
        verdict: 'true',
        confidence: 0.99,
      });

      mockComplete
        .mockResolvedValueOnce(makeLLMResponse(l2rJson))
        .mockResolvedValueOnce(makeLLMResponse(r2lJson));

      const result = await paradigm.execute('Very confident claim', {}, { weight: 1.0 });

      // stepScore = 0.99 for both
      // scores = 0.99 for both (true verdict)
      // sqrt(0.99 * 0.99) * 1.1 = 0.99 * 1.1 = 1.089 → capped at 1.0
      expect(result.confidence).toBe(1.0);
    });
  });
});

describe('createBiPRMParadigm factory', () => {
  it('should create a BiPRMParadigm instance', () => {
    const paradigm = createBiPRMParadigm({ openai: 'test-key' });

    expect(paradigm).toBeInstanceOf(BiPRMParadigm);
    expect(paradigm.name).toBe('biprm');
  });

  it('should accept multiple provider keys', () => {
    const paradigm = createBiPRMParadigm({
      openai: 'test-openai',
      anthropic: 'test-anthropic',
    });

    expect(paradigm).toBeInstanceOf(BiPRMParadigm);
  });
});
