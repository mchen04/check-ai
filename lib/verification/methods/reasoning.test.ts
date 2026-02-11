/**
 * Tests for Reasoning Verification Method
 * Tests adaptive self-refinement (TTT): high/low confidence skip critique,
 * ambiguous zone triggers critique, reconciliation logic, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReasoningParadigm, createReasoningParadigm } from './reasoning';

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
  calculateCostCents: vi.fn().mockReturnValue(0),
}));

const mockParseVerificationResponse = vi.fn();

vi.mock('../prompts', () => ({
  REASONING_SYSTEM_PROMPT: 'mock-system-prompt',
  REASONING_USER_PROMPT: vi.fn().mockReturnValue('mock-user-prompt'),
  REASONING_CRITIQUE_SYSTEM_PROMPT: 'mock-critique-system-prompt',
  createReasoningCritiqueUserPrompt: vi.fn().mockReturnValue('mock-critique-user-prompt'),
  parseVerificationResponse: (...args: unknown[]) => mockParseVerificationResponse(...args),
}));

vi.mock('./shared', () => ({
  selectBestProvider: vi.fn().mockReturnValue('openai'),
  getDefaultModel: vi.fn().mockReturnValue('gpt-4'),
  createParadigmErrorResult: vi.fn(
    (paradigm, weight, provider, model, processingTimeMs, error) => ({
      paradigm,
      weight,
      provider,
      model,
      verdict: null,
      confidence: 0,
      reasoning: null,
      processingTimeMs,
      costCents: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  ),
  REASONING_PROVIDER_PREFERENCE: ['anthropic', 'openai'],
}));

// =============================================================================
// HELPERS
// =============================================================================

function makeLLMResponse(overrides?: Partial<{
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}>) {
  return {
    content: overrides?.content ?? 'mocked response',
    model: overrides?.model ?? 'gpt-4',
    usage: {
      inputTokens: overrides?.inputTokens ?? 100,
      outputTokens: overrides?.outputTokens ?? 50,
    },
    finishReason: 'stop' as const,
    processingTimeMs: 100,
  };
}

const DEFAULT_OPTIONS = { weight: 1.0 };
const CONTENT = 'The sky is blue.';
const CONTEXT = {};

// =============================================================================
// TESTS
// =============================================================================

describe('ReasoningParadigm', () => {
  let paradigm: ReasoningParadigm;

  beforeEach(() => {
    vi.clearAllMocks();
    paradigm = new ReasoningParadigm({ openai: 'test-key' });
  });

  // ---------------------------------------------------------------------------
  // No-refinement paths
  // ---------------------------------------------------------------------------

  describe('No refinement (high confidence)', () => {
    it('should return initial result directly when confidence > 0.85', async () => {
      mockComplete.mockResolvedValueOnce(makeLLMResponse());
      mockParseVerificationResponse.mockReturnValueOnce({
        verdict: 'true',
        confidence: 0.95,
        reasoning: 'Clearly correct.',
      });

      const result = await paradigm.execute(CONTENT, CONTEXT, DEFAULT_OPTIONS);

      expect(mockComplete).toHaveBeenCalledTimes(1);
      expect(result.verdict).toBe('true');
      expect(result.confidence).toBe(0.95);
      expect(result.reasoning).toBe('Clearly correct.');
      expect(result.paradigm).toBe('reasoning');
    });
  });

  describe('No refinement (low confidence)', () => {
    it('should return initial result directly when confidence < 0.4', async () => {
      mockComplete.mockResolvedValueOnce(makeLLMResponse());
      mockParseVerificationResponse.mockReturnValueOnce({
        verdict: 'false',
        confidence: 0.2,
        reasoning: 'Likely false but low confidence.',
      });

      const result = await paradigm.execute(CONTENT, CONTEXT, DEFAULT_OPTIONS);

      expect(mockComplete).toHaveBeenCalledTimes(1);
      expect(result.verdict).toBe('false');
      expect(result.confidence).toBe(0.2);
      expect(result.reasoning).toBe('Likely false but low confidence.');
    });
  });

  // ---------------------------------------------------------------------------
  // Critique trigger paths
  // ---------------------------------------------------------------------------

  describe('Ambiguous confidence triggers critique', () => {
    it('should trigger critique when confidence is in [0.4, 0.85]', async () => {
      mockComplete
        .mockResolvedValueOnce(makeLLMResponse())   // Phase 1
        .mockResolvedValueOnce(makeLLMResponse());   // Phase 2 critique

      mockParseVerificationResponse
        .mockReturnValueOnce({
          verdict: 'true',
          confidence: 0.6,
          reasoning: 'Probably true.',
        })
        .mockReturnValueOnce({
          verdict: 'true',
          confidence: 0.7,
          reasoning: 'Confirmed true.',
        });

      const result = await paradigm.execute(CONTENT, CONTEXT, DEFAULT_OPTIONS);

      expect(mockComplete).toHaveBeenCalledTimes(2);
      expect(result.paradigm).toBe('reasoning');
    });

    it('should trigger critique at boundary 0.4', async () => {
      mockComplete
        .mockResolvedValueOnce(makeLLMResponse())
        .mockResolvedValueOnce(makeLLMResponse());

      mockParseVerificationResponse
        .mockReturnValueOnce({ verdict: 'true', confidence: 0.4, reasoning: 'Boundary low.' })
        .mockReturnValueOnce({ verdict: 'true', confidence: 0.5, reasoning: 'Agrees.' });

      const result = await paradigm.execute(CONTENT, CONTEXT, DEFAULT_OPTIONS);

      expect(mockComplete).toHaveBeenCalledTimes(2);
      // Agreement: 0.4 * 1.15 = 0.46
      expect(result.confidence).toBeCloseTo(0.46, 2);
    });

    it('should trigger critique at boundary 0.85', async () => {
      mockComplete
        .mockResolvedValueOnce(makeLLMResponse())
        .mockResolvedValueOnce(makeLLMResponse());

      mockParseVerificationResponse
        .mockReturnValueOnce({ verdict: 'true', confidence: 0.85, reasoning: 'High boundary.' })
        .mockReturnValueOnce({ verdict: 'true', confidence: 0.9, reasoning: 'Agrees.' });

      const result = await paradigm.execute(CONTENT, CONTEXT, DEFAULT_OPTIONS);

      expect(mockComplete).toHaveBeenCalledTimes(2);
      // Agreement: 0.85 * 1.15 = 0.9775
      expect(result.confidence).toBeCloseTo(0.9775, 4);
    });
  });

  describe('Uncertain verdict triggers critique', () => {
    it('should trigger critique when verdict is uncertain regardless of confidence', async () => {
      mockComplete
        .mockResolvedValueOnce(makeLLMResponse())
        .mockResolvedValueOnce(makeLLMResponse());

      mockParseVerificationResponse
        .mockReturnValueOnce({
          verdict: 'uncertain',
          confidence: 0.95,
          reasoning: 'Cannot determine.',
        })
        .mockReturnValueOnce({
          verdict: 'true',
          confidence: 0.8,
          reasoning: 'Actually seems true.',
        });

      const result = await paradigm.execute(CONTENT, CONTEXT, DEFAULT_OPTIONS);

      // Critique called despite high confidence because verdict was uncertain
      expect(mockComplete).toHaveBeenCalledTimes(2);
      // Disagreement: critique discounted = 0.8 * 0.9 = 0.72 < initial 0.95
      // So initial verdict kept, but confidence capped at 0.75
      expect(result.verdict).toBe('uncertain');
      expect(result.confidence).toBe(0.75);
    });
  });

  // ---------------------------------------------------------------------------
  // Reconciliation logic
  // ---------------------------------------------------------------------------

  describe('Agreement in critique', () => {
    it('should boost confidence by 1.15x when verdicts agree', async () => {
      mockComplete
        .mockResolvedValueOnce(makeLLMResponse())
        .mockResolvedValueOnce(makeLLMResponse());

      mockParseVerificationResponse
        .mockReturnValueOnce({ verdict: 'true', confidence: 0.7, reasoning: 'Initial reasoning.' })
        .mockReturnValueOnce({ verdict: 'true', confidence: 0.8, reasoning: 'Critique agrees.' });

      const result = await paradigm.execute(CONTENT, CONTEXT, DEFAULT_OPTIONS);

      // 0.7 * 1.15 = 0.805
      expect(result.verdict).toBe('true');
      expect(result.confidence).toBeCloseTo(0.805, 3);
      expect(result.reasoning).toContain('Initial reasoning.');
      expect(result.reasoning).toContain('[Self-critique AGREES]');
      expect(result.reasoning).toContain('Critique agrees.');
    });

    it('should cap boosted confidence at 1.0', async () => {
      mockComplete
        .mockResolvedValueOnce(makeLLMResponse())
        .mockResolvedValueOnce(makeLLMResponse());

      mockParseVerificationResponse
        .mockReturnValueOnce({ verdict: 'false', confidence: 0.9, reasoning: 'Very false.' })
        .mockReturnValueOnce({ verdict: 'false', confidence: 0.95, reasoning: 'Confirmed.' });

      // 0.9 triggers critique because 0.9 > 0.85 but we need the verdict to NOT be uncertain
      // Wait: 0.9 > 0.85 means needsRefinement returns false. We need to use uncertain verdict
      // to force critique. Let's use confidence in range instead.
      // Reconfigure: use confidence 0.85 (boundary, will trigger) or uncertain verdict
      mockParseVerificationResponse.mockReset();
      mockParseVerificationResponse
        .mockReturnValueOnce({ verdict: 'uncertain', confidence: 0.9, reasoning: 'Unsure but high.' })
        .mockReturnValueOnce({ verdict: 'uncertain', confidence: 0.95, reasoning: 'Still unsure.' });

      const result = await paradigm.execute(CONTENT, CONTEXT, DEFAULT_OPTIONS);

      // Agreement (both uncertain): 0.9 * 1.15 = 1.035 -> capped at 1.0
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('Disagreement in critique', () => {
    it('should use critique verdict when discounted critique confidence exceeds initial', async () => {
      mockComplete
        .mockResolvedValueOnce(makeLLMResponse())
        .mockResolvedValueOnce(makeLLMResponse());

      mockParseVerificationResponse
        .mockReturnValueOnce({ verdict: 'true', confidence: 0.5, reasoning: 'Seems true.' })
        .mockReturnValueOnce({ verdict: 'false', confidence: 0.9, reasoning: 'Actually false.' });

      const result = await paradigm.execute(CONTENT, CONTEXT, DEFAULT_OPTIONS);

      // Discounted critique: 0.9 * 0.9 = 0.81 > initial 0.5 -> use critique verdict
      // Confidence = min(0.81, 0.75) = 0.75
      expect(result.verdict).toBe('false');
      expect(result.confidence).toBe(0.75);
      expect(result.reasoning).toContain('[Self-critique DISAGREES');
      expect(result.reasoning).toContain('Actually false.');
    });

    it('should keep initial verdict when initial confidence exceeds discounted critique', async () => {
      mockComplete
        .mockResolvedValueOnce(makeLLMResponse())
        .mockResolvedValueOnce(makeLLMResponse());

      mockParseVerificationResponse
        .mockReturnValueOnce({ verdict: 'true', confidence: 0.8, reasoning: 'Strongly true.' })
        .mockReturnValueOnce({ verdict: 'false', confidence: 0.7, reasoning: 'Weakly false.' });

      const result = await paradigm.execute(CONTENT, CONTEXT, DEFAULT_OPTIONS);

      // Discounted critique: 0.7 * 0.9 = 0.63 < initial 0.8 -> keep initial verdict
      // Confidence = min(0.8, 0.75) = 0.75
      expect(result.verdict).toBe('true');
      expect(result.confidence).toBe(0.75);
      expect(result.reasoning).toContain('[Self-critique DISAGREES');
    });

    it('should cap disagreement confidence at 0.75 even when discounted critique is lower', async () => {
      mockComplete
        .mockResolvedValueOnce(makeLLMResponse())
        .mockResolvedValueOnce(makeLLMResponse());

      mockParseVerificationResponse
        .mockReturnValueOnce({ verdict: 'true', confidence: 0.6, reasoning: 'Maybe true.' })
        .mockReturnValueOnce({ verdict: 'false', confidence: 0.5, reasoning: 'Maybe false.' });

      const result = await paradigm.execute(CONTENT, CONTEXT, DEFAULT_OPTIONS);

      // Discounted critique: 0.5 * 0.9 = 0.45 < initial 0.6 -> keep initial
      // Confidence = min(0.6, 0.75) = 0.6
      expect(result.verdict).toBe('true');
      expect(result.confidence).toBe(0.6);
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  describe('Error handling', () => {
    it('should return error result via createParadigmErrorResult on LLM failure', async () => {
      const error = new Error('API rate limit exceeded');
      mockComplete.mockRejectedValueOnce(error);

      const result = await paradigm.execute(CONTENT, CONTEXT, DEFAULT_OPTIONS);

      expect(result.paradigm).toBe('reasoning');
      expect(result.verdict).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('API rate limit exceeded');
    });

    it('should return error result when critique call fails', async () => {
      mockComplete
        .mockResolvedValueOnce(makeLLMResponse())
        .mockRejectedValueOnce(new Error('Critique timeout'));

      mockParseVerificationResponse.mockReturnValueOnce({
        verdict: 'true',
        confidence: 0.6,
        reasoning: 'Ambiguous.',
      });

      const result = await paradigm.execute(CONTENT, CONTEXT, DEFAULT_OPTIONS);

      expect(result.verdict).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('Critique timeout');
    });
  });

  // ---------------------------------------------------------------------------
  // Provider/model selection
  // ---------------------------------------------------------------------------

  describe('Provider and model selection', () => {
    it('should use provided provider and model from options when set', async () => {
      mockComplete.mockResolvedValueOnce(makeLLMResponse({ model: 'claude-3-opus' }));
      mockParseVerificationResponse.mockReturnValueOnce({
        verdict: 'true',
        confidence: 0.95,
        reasoning: 'High confidence.',
      });

      const result = await paradigm.execute(CONTENT, CONTEXT, {
        weight: 1.0,
        provider: 'anthropic',
        model: 'claude-3-opus',
      });

      // Verify the provider passed to complete is 'anthropic'
      expect(mockComplete).toHaveBeenCalledWith(
        'anthropic',
        expect.any(Array),
        expect.objectContaining({ model: 'claude-3-opus' })
      );
      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-3-opus');
    });

    it('should fall back to selectBestProvider when no provider in options', async () => {
      const { selectBestProvider } = await import('./shared');

      mockComplete.mockResolvedValueOnce(makeLLMResponse());
      mockParseVerificationResponse.mockReturnValueOnce({
        verdict: 'true',
        confidence: 0.95,
        reasoning: 'Confident.',
      });

      await paradigm.execute(CONTENT, CONTEXT, { weight: 1.0 });

      // selectBestProvider should have been called since no provider in options
      expect(selectBestProvider).toHaveBeenCalled();
      // The complete call should use 'openai' (mocked return from selectBestProvider)
      expect(mockComplete).toHaveBeenCalledWith(
        'openai',
        expect.any(Array),
        expect.objectContaining({ model: 'gpt-4' })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Result structure
  // ---------------------------------------------------------------------------

  describe('Result structure', () => {
    it('should include all required ParadigmResult fields', async () => {
      mockComplete.mockResolvedValueOnce(makeLLMResponse());
      mockParseVerificationResponse.mockReturnValueOnce({
        verdict: 'true',
        confidence: 0.95,
        reasoning: 'Verified.',
      });

      const result = await paradigm.execute(CONTENT, CONTEXT, { weight: 0.8 });

      expect(result).toHaveProperty('paradigm', 'reasoning');
      expect(result).toHaveProperty('weight', 0.8);
      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('verdict');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('processingTimeMs');
      expect(result).toHaveProperty('costCents');
      expect(result).toHaveProperty('tokenUsage');
      expect(result.tokenUsage).toEqual({ inputTokens: 100, outputTokens: 50 });
    });

    it('should accumulate token usage across both phases', async () => {
      mockComplete
        .mockResolvedValueOnce(makeLLMResponse({ inputTokens: 100, outputTokens: 50 }))
        .mockResolvedValueOnce(makeLLMResponse({ inputTokens: 120, outputTokens: 60 }));

      mockParseVerificationResponse
        .mockReturnValueOnce({ verdict: 'true', confidence: 0.6, reasoning: 'Ambiguous.' })
        .mockReturnValueOnce({ verdict: 'true', confidence: 0.7, reasoning: 'Agrees.' });

      const result = await paradigm.execute(CONTENT, CONTEXT, DEFAULT_OPTIONS);

      expect(result.tokenUsage).toEqual({
        inputTokens: 220,
        outputTokens: 110,
      });
    });

    it('should have non-negative processingTimeMs', async () => {
      mockComplete.mockResolvedValueOnce(makeLLMResponse());
      mockParseVerificationResponse.mockReturnValueOnce({
        verdict: 'true',
        confidence: 0.95,
        reasoning: 'Fast.',
      });

      const result = await paradigm.execute(CONTENT, CONTEXT, DEFAULT_OPTIONS);

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Paradigm identity
  // ---------------------------------------------------------------------------

  describe('Paradigm identity', () => {
    it('should have name property set to reasoning', () => {
      expect(paradigm.name).toBe('reasoning');
    });
  });
});

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

describe('createReasoningParadigm factory', () => {
  it('should create a ReasoningParadigm instance', () => {
    const paradigm = createReasoningParadigm({ openai: 'test-key' });

    expect(paradigm).toBeInstanceOf(ReasoningParadigm);
    expect(paradigm.name).toBe('reasoning');
  });

  it('should accept multiple provider keys', () => {
    const paradigm = createReasoningParadigm({
      openai: 'test-openai',
      anthropic: 'test-anthropic',
    });

    expect(paradigm).toBeInstanceOf(ReasoningParadigm);
  });
});
