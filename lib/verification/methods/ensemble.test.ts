/**
 * Tests for Ensemble Verification Method
 * Tests multi-model ensemble voting, meta-judge adjudication, and aggregation logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnsembleParadigm, createEnsembleParadigm } from './ensemble';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockComplete = vi.fn();
const mockHasProvider = vi.fn();

vi.mock('@/lib/llm', () => ({
  LLMClient: class MockLLMClient {
    constructor() {}
    complete = mockComplete;
    hasProvider = mockHasProvider;
  },
  calculateCostCents: vi.fn().mockReturnValue(0.01),
}));

const mockParseVerificationResponse = vi.fn();

vi.mock('../prompts', () => ({
  ENSEMBLE_SYSTEM_PROMPT: 'mock-ensemble-system-prompt',
  ENSEMBLE_USER_PROMPT: (content: string, context?: Record<string, unknown>) =>
    `mock-ensemble-user: ${content}`,
  META_JUDGE_SYSTEM_PROMPT: 'mock-meta-judge-system-prompt',
  createMetaJudgeUserPrompt: (
    claim: string,
    memberResults: unknown[],
    claimType: string
  ) => `mock-meta-judge-user: ${claim} [${claimType}]`,
  parseVerificationResponse: (...args: unknown[]) =>
    mockParseVerificationResponse(...args),
}));

const mockGetDefaultModel = vi.fn();
const mockCreateParadigmErrorResult = vi.fn();

vi.mock('./shared', () => ({
  getDefaultModel: (...args: unknown[]) => mockGetDefaultModel(...args),
  createParadigmErrorResult: (...args: unknown[]) =>
    mockCreateParadigmErrorResult(...args),
}));

// =============================================================================
// HELPERS
// =============================================================================

function makeLLMResponse(content: string, inputTokens = 100, outputTokens = 50) {
  return {
    content,
    usage: { inputTokens, outputTokens },
  };
}

function makeParsedResponse(
  verdict: 'true' | 'false' | 'uncertain',
  confidence: number,
  reasoning: string
) {
  return { verdict, confidence, reasoning };
}

const DEFAULT_OPTIONS = { weight: 1.0 };
const DEFAULT_CONTEXT = {};

// =============================================================================
// TESTS
// =============================================================================

describe('EnsembleParadigm', () => {
  let paradigm: EnsembleParadigm;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: anthropic, openai, google available
    mockHasProvider.mockImplementation((provider: string) =>
      ['anthropic', 'openai', 'google'].includes(provider)
    );

    mockGetDefaultModel.mockImplementation((provider: string) => {
      const models: Record<string, string> = {
        anthropic: 'claude-sonnet-4-20250514',
        openai: 'gpt-4.1',
        google: 'gemini-2.5-flash',
        mistral: 'mistral-large-latest',
      };
      return models[provider] || 'default-model';
    });

    mockCreateParadigmErrorResult.mockImplementation(
      (
        paradigmName: string,
        weight: number,
        provider: string,
        model: string,
        processingTimeMs: number,
        error: unknown
      ) => ({
        paradigm: paradigmName,
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
    );

    paradigm = new EnsembleParadigm({ anthropic: 'test-key', openai: 'test-key', google: 'test-key' });
  });

  // ---------------------------------------------------------------------------
  // 1. Unanimous high confidence -> no meta-judge
  // ---------------------------------------------------------------------------

  describe('Unanimous high confidence', () => {
    it('should return aggregated result without triggering meta-judge', async () => {
      // All 3 members return true with confidence > 0.8
      mockComplete.mockResolvedValue(makeLLMResponse('{"verdict":"true","confidence":0.95}'));
      mockParseVerificationResponse.mockReturnValue(
        makeParsedResponse('true', 0.95, 'Claim is accurate based on evidence')
      );

      const result = await paradigm.execute('The Earth orbits the Sun', DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      expect(result.paradigm).toBe('ensemble');
      expect(result.verdict).toBe('true');
      expect(result.confidence).toBeGreaterThan(0);
      // 3 member calls, no meta-judge call
      expect(mockComplete).toHaveBeenCalledTimes(3);
      expect(result.reasoning).not.toContain('[META-JUDGE]');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Unanimous but low confidence -> meta-judge triggered
  // ---------------------------------------------------------------------------

  describe('Unanimous but low confidence', () => {
    it('should trigger meta-judge when all agree but confidence is low', async () => {
      // Members all say true but with confidence <= 0.8
      let callCount = 0;
      mockComplete.mockImplementation(() => {
        callCount++;
        return Promise.resolve(makeLLMResponse(`response-${callCount}`));
      });

      // First 3 calls: member responses (unanimous true, low confidence)
      // 4th call: meta-judge response
      mockParseVerificationResponse
        .mockReturnValueOnce(makeParsedResponse('true', 0.6, 'Probably true'))
        .mockReturnValueOnce(makeParsedResponse('true', 0.65, 'Likely true'))
        .mockReturnValueOnce(makeParsedResponse('true', 0.7, 'Seems true'))
        .mockReturnValueOnce(makeParsedResponse('true', 0.85, 'Meta-judge confirms true'));

      const result = await paradigm.execute('Some claim', DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      // 3 member calls + 1 meta-judge call
      expect(mockComplete).toHaveBeenCalledTimes(4);
      expect(result.verdict).toBe('true');
      expect(result.reasoning).toContain('[META-JUDGE]');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Non-unanimous -> meta-judge triggered
  // ---------------------------------------------------------------------------

  describe('Non-unanimous results', () => {
    it('should trigger meta-judge when members disagree', async () => {
      let callCount = 0;
      mockComplete.mockImplementation(() => {
        callCount++;
        return Promise.resolve(makeLLMResponse(`response-${callCount}`));
      });

      // Members disagree: true, false, true
      mockParseVerificationResponse
        .mockReturnValueOnce(makeParsedResponse('true', 0.9, 'True analysis'))
        .mockReturnValueOnce(makeParsedResponse('false', 0.85, 'False analysis'))
        .mockReturnValueOnce(makeParsedResponse('true', 0.9, 'True analysis'))
        .mockReturnValueOnce(makeParsedResponse('true', 0.88, 'Meta-judge says true'));

      const result = await paradigm.execute('Debatable claim', DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      // 3 member + 1 meta-judge
      expect(mockComplete).toHaveBeenCalledTimes(4);
      expect(result.reasoning).toContain('[META-JUDGE]');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Meta-judge overrides aggregated verdict
  // ---------------------------------------------------------------------------

  describe('Meta-judge override', () => {
    it('should use meta-judge verdict instead of aggregated verdict', async () => {
      let callCount = 0;
      mockComplete.mockImplementation(() => {
        callCount++;
        return Promise.resolve(makeLLMResponse(`response-${callCount}`));
      });

      // Members: true(0.6), true(0.6), false(0.9) -> aggregated might lean true
      // Meta-judge: false -> overrides
      mockParseVerificationResponse
        .mockReturnValueOnce(makeParsedResponse('true', 0.6, 'Weak true'))
        .mockReturnValueOnce(makeParsedResponse('true', 0.6, 'Weak true'))
        .mockReturnValueOnce(makeParsedResponse('false', 0.9, 'Strong false'))
        .mockReturnValueOnce(makeParsedResponse('false', 0.92, 'Meta-judge: false'));

      const result = await paradigm.execute('Some claim', DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      expect(result.verdict).toBe('false');
      expect(result.confidence).toBe(0.92);
      expect(result.reasoning).toContain('[META-JUDGE]');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Meta-judge fails -> falls back to aggregate
  // ---------------------------------------------------------------------------

  describe('Meta-judge failure fallback', () => {
    it('should fall back to aggregated result when meta-judge fails', async () => {
      let callCount = 0;
      mockComplete.mockImplementation(() => {
        callCount++;
        if (callCount === 4) {
          // Meta-judge call fails
          return Promise.reject(new Error('Meta-judge API error'));
        }
        return Promise.resolve(makeLLMResponse(`response-${callCount}`));
      });

      // Members disagree (triggers meta-judge), but meta-judge fails
      mockParseVerificationResponse
        .mockReturnValueOnce(makeParsedResponse('true', 0.9, 'True'))
        .mockReturnValueOnce(makeParsedResponse('false', 0.85, 'False'))
        .mockReturnValueOnce(makeParsedResponse('true', 0.9, 'True'));

      const result = await paradigm.execute('Disputed claim', DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      // Should still produce a result from aggregation
      expect(result.verdict).toBe('true'); // 2 true vs 1 false
      expect(result.reasoning).not.toContain('[META-JUDGE]');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Fewer than 2 members -> error
  // ---------------------------------------------------------------------------

  describe('Insufficient ensemble members', () => {
    it('should return error when fewer than 2 providers available', async () => {
      // Only 1 provider available, no openrouter fallback
      mockHasProvider.mockImplementation((provider: string) => provider === 'anthropic');

      paradigm = new EnsembleParadigm({ anthropic: 'test-key' });

      const result = await paradigm.execute('Some claim', DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      expect(mockCreateParadigmErrorResult).toHaveBeenCalledOnce();
      expect(result.verdict).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. User-provided ensembleMembers used when >= 2
  // ---------------------------------------------------------------------------

  describe('User-provided ensemble members', () => {
    it('should use user-provided members when 2 or more are specified', async () => {
      mockComplete.mockResolvedValue(makeLLMResponse('{"verdict":"true","confidence":0.95}'));
      mockParseVerificationResponse.mockReturnValue(
        makeParsedResponse('true', 0.95, 'Accurate')
      );

      const options = {
        weight: 1.0,
        ensembleMembers: [
          { provider: 'anthropic' as const, model: 'claude-sonnet-4-20250514' },
          { provider: 'openai' as const, model: 'gpt-4.1' },
        ],
      };

      const result = await paradigm.execute('Test claim', DEFAULT_CONTEXT, options);

      // Should use exactly 2 members (user-provided)
      expect(mockComplete).toHaveBeenCalledTimes(2);
      expect(result.model).toBe('ensemble-2');
      expect(result.verdict).toBe('true');
    });

    it('should fall back to auto-selection when fewer than 2 members provided', async () => {
      mockComplete.mockResolvedValue(makeLLMResponse('{"verdict":"true","confidence":0.95}'));
      mockParseVerificationResponse.mockReturnValue(
        makeParsedResponse('true', 0.95, 'Accurate')
      );

      const options = {
        weight: 1.0,
        ensembleMembers: [
          { provider: 'anthropic' as const, model: 'claude-sonnet-4-20250514' },
        ],
      };

      const result = await paradigm.execute('Test claim', DEFAULT_CONTEXT, options);

      // Auto-selection picks 3 (anthropic, openai, google)
      expect(mockComplete).toHaveBeenCalledTimes(3);
      expect(result.model).toBe('ensemble-3');
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Auto-selection picks from available providers
  // ---------------------------------------------------------------------------

  describe('Auto-selection from available providers', () => {
    it('should pick up to 3 diverse models from available providers', async () => {
      // Only openai and google available (no anthropic)
      mockHasProvider.mockImplementation((provider: string) =>
        ['openai', 'google'].includes(provider)
      );

      mockComplete.mockResolvedValue(makeLLMResponse('{"verdict":"true","confidence":0.9}'));
      mockParseVerificationResponse.mockReturnValue(
        makeParsedResponse('true', 0.9, 'True claim')
      );

      paradigm = new EnsembleParadigm({ openai: 'test-key', google: 'test-key' });
      const result = await paradigm.execute('Test claim', DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      // 2 providers available -> 2 members
      expect(mockComplete).toHaveBeenCalledTimes(2);
      expect(result.model).toBe('ensemble-2');
    });

    it('should respect ENSEMBLE_PROVIDER_PRIORITY order', async () => {
      // anthropic, openai, google, mistral all available -- picks first 3
      mockHasProvider.mockImplementation((provider: string) =>
        ['anthropic', 'openai', 'google', 'mistral'].includes(provider)
      );

      mockComplete.mockResolvedValue(makeLLMResponse('{"verdict":"true","confidence":0.95}'));
      mockParseVerificationResponse.mockReturnValue(
        makeParsedResponse('true', 0.95, 'Accurate')
      );

      paradigm = new EnsembleParadigm({
        anthropic: 'key',
        openai: 'key',
        google: 'key',
        mistral: 'key',
      });
      const result = await paradigm.execute('Test', DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      // Caps at 3 members
      expect(mockComplete).toHaveBeenCalledTimes(3);
      expect(result.model).toBe('ensemble-3');
    });
  });

  // ---------------------------------------------------------------------------
  // 9. OpenRouter fallback when insufficient direct providers
  // ---------------------------------------------------------------------------

  describe('OpenRouter fallback', () => {
    it('should use OpenRouter ensemble when only 1 direct provider but openrouter available', async () => {
      mockHasProvider.mockImplementation((provider: string) =>
        ['anthropic', 'openrouter'].includes(provider)
      );

      mockComplete.mockResolvedValue(makeLLMResponse('{"verdict":"true","confidence":0.9}'));
      mockParseVerificationResponse.mockReturnValue(
        makeParsedResponse('true', 0.9, 'Accurate')
      );

      paradigm = new EnsembleParadigm({ anthropic: 'key', openrouter: 'key' });
      const result = await paradigm.execute('Test claim', DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      // OpenRouter ensemble has 3 members
      expect(mockComplete).toHaveBeenCalledTimes(3);
      expect(result.model).toBe('ensemble-3');
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Error in individual member -> excluded from valid results
  // ---------------------------------------------------------------------------

  describe('Individual member errors', () => {
    it('should exclude errored members from valid results and still produce verdict', async () => {
      let callCount = 0;
      mockComplete.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          // Second member fails
          return Promise.reject(new Error('Provider timeout'));
        }
        return Promise.resolve(makeLLMResponse(`response-${callCount}`));
      });

      // Only 2 successful members (both true, high confidence) -> unanimous, no meta-judge
      mockParseVerificationResponse
        .mockReturnValueOnce(makeParsedResponse('true', 0.95, 'True'))
        .mockReturnValueOnce(makeParsedResponse('true', 0.9, 'True'));

      const result = await paradigm.execute('Test claim', DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      // 3 member calls attempted
      expect(mockComplete).toHaveBeenCalledTimes(3);
      // Result based on 2 valid members
      expect(result.verdict).toBe('true');
    });
  });

  // ---------------------------------------------------------------------------
  // 11. All members error -> uncertain with 0 confidence
  // ---------------------------------------------------------------------------

  describe('All members error', () => {
    it('should return uncertain with 0 confidence when all members fail', async () => {
      mockComplete.mockRejectedValue(new Error('All APIs down'));

      const result = await paradigm.execute('Test claim', DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      expect(result.verdict).toBe('uncertain');
      expect(result.confidence).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Meta-judge provider selection
  // ---------------------------------------------------------------------------

  describe('Meta-judge provider selection', () => {
    it('should pick a meta-judge provider not in the ensemble', async () => {
      // Ensemble auto-selects: anthropic, openai, google
      // Meta-judge should pick mistral (first in metaJudgePriority not in ensemble)
      mockHasProvider.mockImplementation((provider: string) =>
        ['anthropic', 'openai', 'google', 'mistral'].includes(provider)
      );

      let callCount = 0;
      const callProviders: string[] = [];
      mockComplete.mockImplementation((...args: unknown[]) => {
        callCount++;
        callProviders.push(args[0] as string);
        return Promise.resolve(makeLLMResponse(`response-${callCount}`));
      });

      // Non-unanimous to trigger meta-judge
      mockParseVerificationResponse
        .mockReturnValueOnce(makeParsedResponse('true', 0.9, 'True'))
        .mockReturnValueOnce(makeParsedResponse('false', 0.85, 'False'))
        .mockReturnValueOnce(makeParsedResponse('true', 0.9, 'True'))
        .mockReturnValueOnce(makeParsedResponse('true', 0.9, 'Meta-judge'));

      paradigm = new EnsembleParadigm({
        anthropic: 'key',
        openai: 'key',
        google: 'key',
        mistral: 'key',
      });
      await paradigm.execute('Test', DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      // 4th call should be meta-judge using mistral
      expect(callProviders[3]).toBe('mistral');
    });
  });

  // ---------------------------------------------------------------------------
  // Result structure
  // ---------------------------------------------------------------------------

  describe('Result structure', () => {
    it('should include all required ParadigmResult fields', async () => {
      mockComplete.mockResolvedValue(makeLLMResponse('{"verdict":"true","confidence":0.95}'));
      mockParseVerificationResponse.mockReturnValue(
        makeParsedResponse('true', 0.95, 'Accurate')
      );

      const result = await paradigm.execute('Test', DEFAULT_CONTEXT, { weight: 0.8 });

      expect(result).toHaveProperty('paradigm', 'ensemble');
      expect(result).toHaveProperty('weight', 0.8);
      expect(result).toHaveProperty('provider', 'openai');
      expect(result).toHaveProperty('model');
      expect(result.model).toMatch(/^ensemble-\d+$/);
      expect(result).toHaveProperty('verdict');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('processingTimeMs');
      expect(result).toHaveProperty('costCents');
      expect(result).toHaveProperty('tokenUsage');
      expect(result.tokenUsage).toHaveProperty('inputTokens');
      expect(result.tokenUsage).toHaveProperty('outputTokens');
    });

    it('should preserve the weight from options', async () => {
      mockComplete.mockResolvedValue(makeLLMResponse('{"verdict":"true","confidence":0.95}'));
      mockParseVerificationResponse.mockReturnValue(
        makeParsedResponse('true', 0.95, 'Accurate')
      );

      const result = await paradigm.execute('Test', DEFAULT_CONTEXT, { weight: 0.42 });

      expect(result.weight).toBe(0.42);
    });

    it('should have valid processing time', async () => {
      mockComplete.mockResolvedValue(makeLLMResponse('{"verdict":"true","confidence":0.95}'));
      mockParseVerificationResponse.mockReturnValue(
        makeParsedResponse('true', 0.95, 'Accurate')
      );

      const result = await paradigm.execute('Test', DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      expect(typeof result.processingTimeMs).toBe('number');
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should accumulate token usage from all members', async () => {
      mockComplete.mockResolvedValue(makeLLMResponse('response', 200, 100));
      mockParseVerificationResponse.mockReturnValue(
        makeParsedResponse('true', 0.95, 'Accurate')
      );

      const result = await paradigm.execute('Test', DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      // 3 members * 200 input = 600, 3 members * 100 output = 300
      expect(result.tokenUsage?.inputTokens).toBe(600);
      expect(result.tokenUsage?.outputTokens).toBe(300);
    });

    it('should include meta-judge tokens when meta-judge is triggered', async () => {
      let callCount = 0;
      mockComplete.mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.resolve(makeLLMResponse('member-response', 200, 100));
        }
        // Meta-judge response
        return Promise.resolve(makeLLMResponse('meta-judge-response', 300, 150));
      });

      // Non-unanimous to trigger meta-judge
      mockParseVerificationResponse
        .mockReturnValueOnce(makeParsedResponse('true', 0.9, 'True'))
        .mockReturnValueOnce(makeParsedResponse('false', 0.85, 'False'))
        .mockReturnValueOnce(makeParsedResponse('true', 0.9, 'True'))
        .mockReturnValueOnce(makeParsedResponse('true', 0.88, 'Meta-judge'));

      const result = await paradigm.execute('Test', DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      // 3 * 200 + 300 = 900 input, 3 * 100 + 150 = 450 output
      expect(result.tokenUsage?.inputTokens).toBe(900);
      expect(result.tokenUsage?.outputTokens).toBe(450);
    });
  });

  // ---------------------------------------------------------------------------
  // Paradigm identity
  // ---------------------------------------------------------------------------

  describe('Paradigm identity', () => {
    it('should have name property set to ensemble', () => {
      expect(paradigm.name).toBe('ensemble');
    });
  });

  // ---------------------------------------------------------------------------
  // Reasoning format
  // ---------------------------------------------------------------------------

  describe('Reasoning format', () => {
    it('should include member-by-member breakdown in reasoning', async () => {
      mockComplete.mockResolvedValue(makeLLMResponse('response'));
      mockParseVerificationResponse.mockReturnValue(
        makeParsedResponse('true', 0.95, 'This is a true claim based on solid evidence and reasoning')
      );

      const result = await paradigm.execute('Test', DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      expect(result.reasoning).toContain('Ensemble of 3 models');
      expect(result.reasoning).toContain('Consensus:');
      expect(result.reasoning).toContain('true');
      expect(result.reasoning).toContain('95%');
    });

    it('should show error status for failed members', async () => {
      let callCount = 0;
      mockComplete.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Provider timeout'));
        }
        return Promise.resolve(makeLLMResponse('response'));
      });

      mockParseVerificationResponse.mockReturnValue(
        makeParsedResponse('true', 0.95, 'True claim')
      );

      const result = await paradigm.execute('Test', DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      expect(result.reasoning).toContain('Error: Provider timeout');
    });
  });
});

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

describe('createEnsembleParadigm factory', () => {
  it('should create an EnsembleParadigm instance', () => {
    const paradigm = createEnsembleParadigm({ openai: 'test-key' });

    expect(paradigm).toBeInstanceOf(EnsembleParadigm);
    expect(paradigm.name).toBe('ensemble');
  });

  it('should accept multiple provider keys', () => {
    const paradigm = createEnsembleParadigm({
      openai: 'test-openai',
      anthropic: 'test-anthropic',
      google: 'test-google',
    });

    expect(paradigm).toBeInstanceOf(EnsembleParadigm);
  });
});
