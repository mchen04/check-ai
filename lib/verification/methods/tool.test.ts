/**
 * Tests for Tool-Augmented Verification Method (CLoVE)
 * Tests web search, query extraction, CLoVE response parsing, and confidence adjustments
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToolParadigm, createToolParadigm } from './tool';

// =============================================================================
// MOCKS
// =============================================================================

const mockComplete = vi.fn();
const mockHasProvider = vi.fn().mockReturnValue(true);

vi.mock('@/lib/llm/client', () => {
  return {
    LLMClient: class MockLLMClient {
      constructor() {}
      complete = mockComplete;
      hasProvider = mockHasProvider;
    },
    LLMError: class MockLLMError extends Error {
      constructor(message: string) {
        super(message);
      }
    },
  };
});

vi.mock('@/lib/llm/types', () => ({
  calculateCostCents: vi.fn().mockReturnValue(0.01),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// =============================================================================
// HELPERS
// =============================================================================

const SERPER_SEARCH_URL = 'https://google.serper.dev/search';

function makeCLoVEResponse(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    verdict: 'true',
    confidence: 0.8,
    sources: [
      { source_index: 1, supports: true, relevance: 0.9, independent: true },
      { source_index: 2, supports: true, relevance: 0.7, independent: false },
    ],
    contrastive_plausibility: 0.2,
    reasoning: 'Test reasoning from CLoVE analysis',
    ...overrides,
  });
}

function makeLLMResponse(content: string) {
  return {
    content,
    model: 'gpt-4o',
    usage: { inputTokens: 500, outputTokens: 200 },
  };
}

function makeSerperResponse(organic: Array<{ title: string; link: string; snippet: string }> = []) {
  return {
    ok: true,
    json: () => Promise.resolve({ organic }),
    status: 200,
  };
}

const defaultSearchResults = [
  {
    title: 'Earth Orbit Wikipedia',
    link: 'https://en.wikipedia.org/wiki/Earth_orbit',
    snippet: 'The Earth orbits the Sun at an average distance of about 93 million miles.',
  },
  {
    title: 'NASA Solar System',
    link: 'https://solarsystem.nasa.gov/planets/earth',
    snippet: 'Earth is the third planet from the Sun, orbiting at 1 AU.',
  },
];

// =============================================================================
// TESTS
// =============================================================================

describe('ToolParadigm', () => {
  let paradigm: ToolParadigm;
  let originalFetch: typeof globalThis.fetch;
  let originalSerperKey: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = globalThis.fetch;
    originalSerperKey = process.env.SERPER_API_KEY;

    // Default: set SERPER_API_KEY so search path is exercised
    process.env.SERPER_API_KEY = 'test-serper-key';

    // Default fetch mock: returns search results
    globalThis.fetch = vi.fn().mockResolvedValue(makeSerperResponse(defaultSearchResults));

    // Default LLM mock: returns valid CLoVE JSON
    mockComplete.mockResolvedValue(makeLLMResponse(makeCLoVEResponse()));

    paradigm = new ToolParadigm({ openai: 'test-key' });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalSerperKey !== undefined) {
      process.env.SERPER_API_KEY = originalSerperKey;
    } else {
      delete process.env.SERPER_API_KEY;
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Successful execution with search results
  // ---------------------------------------------------------------------------

  describe('successful execution with search results', () => {
    it('should return a tool result with verdict, confidence, and reasoning', async () => {
      const result = await paradigm.execute(
        'The Earth orbits the Sun',
        {},
        { weight: 1.0 }
      );

      expect(result.paradigm).toBe('tool');
      expect(result.verdict).toBe('true');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.reasoning).toContain('Test reasoning from CLoVE analysis');
      expect(result.reasoning).toContain('Source Assessments');
      expect(result.model).toBe('gpt-4o');
      expect(result.costCents).toBe(0.01);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should call fetch with correct Serper API parameters', async () => {
      await paradigm.execute('The Earth orbits the Sun', {}, { weight: 1.0 });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        SERPER_SEARCH_URL,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-KEY': 'test-serper-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should call LLM complete with system and user messages', async () => {
      await paradigm.execute('The Earth orbits the Sun', {}, { weight: 1.0 });

      expect(mockComplete).toHaveBeenCalledTimes(1);
      const [provider, messages, options] = mockComplete.mock.calls[0];
      expect(provider).toBeDefined();
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
      expect(options.temperature).toBe(0.1);
      expect(options.maxTokens).toBe(1536);
    });

    it('should include token usage in result', async () => {
      const result = await paradigm.execute(
        'The Earth orbits the Sun',
        {},
        { weight: 1.0 }
      );

      expect(result.tokenUsage).toEqual({
        inputTokens: 500,
        outputTokens: 200,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 2. No SERPER_API_KEY — falls back to mock search results
  // ---------------------------------------------------------------------------

  describe('no SERPER_API_KEY', () => {
    it('should fall back to mock search results and still complete', async () => {
      delete process.env.SERPER_API_KEY;

      const result = await paradigm.execute(
        'Water boils at 100 degrees Celsius',
        {},
        { weight: 1.0 }
      );

      // fetch should NOT be called since there is no key
      expect(globalThis.fetch).not.toHaveBeenCalled();

      // Should still return a valid result from LLM
      expect(result.paradigm).toBe('tool');
      expect(result.verdict).toBe('true');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Search API error — empty results, still completes with LLM analysis
  // ---------------------------------------------------------------------------

  describe('search API error', () => {
    it('should handle HTTP error and still complete with LLM analysis', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
      });

      // When search fails, the LLM gets "No search results found." — mock a response with no sources
      mockComplete.mockResolvedValue(
        makeLLMResponse(
          makeCLoVEResponse({
            sources: [],
            contrastive_plausibility: 0.5,
            reasoning: 'No search results available for verification',
          })
        )
      );

      const result = await paradigm.execute(
        'Python was created by Guido van Rossum',
        {},
        { weight: 1.0 }
      );

      // Should still produce a result (empty search results passed to LLM)
      expect(result.paradigm).toBe('tool');
      expect(result.verdict).toBeDefined();
      expect(result.reasoning).toContain('no sources assessed');
    });

    it('should handle network error and still complete with LLM analysis', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network failure')
      );

      // LLM response with no sources (since search returned nothing)
      mockComplete.mockResolvedValue(
        makeLLMResponse(
          makeCLoVEResponse({
            sources: [],
            contrastive_plausibility: 0.5,
          })
        )
      );

      const result = await paradigm.execute(
        'Python was created by Guido van Rossum',
        {},
        { weight: 1.0 }
      );

      expect(result.paradigm).toBe('tool');
      expect(result.verdict).toBe('true');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. CLoVE response with independent corroborating sources — confidence boosted
  // ---------------------------------------------------------------------------

  describe('confidence adjustment: independent corroborating sources', () => {
    it('should boost confidence for independent corroborating sources', async () => {
      // Two independent sources that support + relevance > 0.3
      mockComplete.mockResolvedValue(
        makeLLMResponse(
          makeCLoVEResponse({
            confidence: 0.7,
            sources: [
              { source_index: 1, supports: true, relevance: 0.9, independent: true },
              { source_index: 2, supports: true, relevance: 0.8, independent: true },
              { source_index: 3, supports: true, relevance: 0.6, independent: true },
            ],
            contrastive_plausibility: 0.0, // no penalty
          })
        )
      );

      const result = await paradigm.execute(
        'The speed of light is approximately 300,000 km/s',
        {},
        { weight: 1.0 }
      );

      // Base 0.7 + 3 * 0.1 = 1.0, capped at 1.0
      // contrastive penalty: * (1 - 0.0 * 0.3) = * 1.0
      // Final: 1.0
      expect(result.confidence).toBe(1.0);
    });

    it('should only boost for sources with relevance > 0.3', async () => {
      mockComplete.mockResolvedValue(
        makeLLMResponse(
          makeCLoVEResponse({
            confidence: 0.7,
            sources: [
              { source_index: 1, supports: true, relevance: 0.9, independent: true },
              { source_index: 2, supports: true, relevance: 0.2, independent: true }, // low relevance
            ],
            contrastive_plausibility: 0.0,
          })
        )
      );

      const result = await paradigm.execute(
        'Test claim',
        {},
        { weight: 1.0 }
      );

      // Base 0.7 + 1 * 0.1 = 0.8 (source 2 excluded: relevance 0.2 <= 0.3)
      // contrastive penalty: * 1.0 = 0.8
      expect(result.confidence).toBeCloseTo(0.8, 2);
    });

    it('should not boost for non-independent sources', async () => {
      mockComplete.mockResolvedValue(
        makeLLMResponse(
          makeCLoVEResponse({
            confidence: 0.7,
            sources: [
              { source_index: 1, supports: true, relevance: 0.9, independent: false },
              { source_index: 2, supports: true, relevance: 0.8, independent: false },
            ],
            contrastive_plausibility: 0.0,
          })
        )
      );

      const result = await paradigm.execute(
        'Test claim',
        {},
        { weight: 1.0 }
      );

      // Base 0.7 + 0 * 0.1 = 0.7 (no independent sources)
      expect(result.confidence).toBeCloseTo(0.7, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. CLoVE response with high contrastive plausibility — confidence reduced
  // ---------------------------------------------------------------------------

  describe('confidence adjustment: contrastive plausibility', () => {
    it('should reduce confidence when contrastive plausibility is high', async () => {
      mockComplete.mockResolvedValue(
        makeLLMResponse(
          makeCLoVEResponse({
            confidence: 0.8,
            sources: [
              { source_index: 1, supports: true, relevance: 0.9, independent: true },
            ],
            contrastive_plausibility: 0.9, // high — the false-world scenario is very plausible
          })
        )
      );

      const result = await paradigm.execute(
        'Some dubious claim',
        {},
        { weight: 1.0 }
      );

      // Base 0.8 + 1 * 0.1 = 0.9
      // contrastive penalty: 0.9 * (1 - 0.9 * 0.3) = 0.9 * 0.73 = 0.657
      expect(result.confidence).toBeCloseTo(0.657, 2);
    });

    it('should apply no penalty when contrastive plausibility is 0', async () => {
      mockComplete.mockResolvedValue(
        makeLLMResponse(
          makeCLoVEResponse({
            confidence: 0.8,
            sources: [],
            contrastive_plausibility: 0.0,
          })
        )
      );

      const result = await paradigm.execute(
        'Test claim',
        {},
        { weight: 1.0 }
      );

      // Base 0.8 + 0 * 0.1 = 0.8
      // contrastive penalty: 0.8 * (1 - 0.0 * 0.3) = 0.8 * 1.0 = 0.8
      expect(result.confidence).toBeCloseTo(0.8, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. CLoVE response with no sources — baseline confidence
  // ---------------------------------------------------------------------------

  describe('no sources in CLoVE response', () => {
    it('should return baseline confidence with no sources', async () => {
      mockComplete.mockResolvedValue(
        makeLLMResponse(
          makeCLoVEResponse({
            confidence: 0.6,
            sources: [],
            contrastive_plausibility: 0.5,
          })
        )
      );

      const result = await paradigm.execute(
        'An obscure claim with no search results',
        {},
        { weight: 1.0 }
      );

      // Base 0.6, no source boost
      // contrastive penalty: 0.6 * (1 - 0.5 * 0.3) = 0.6 * 0.85 = 0.51
      expect(result.confidence).toBeCloseTo(0.51, 2);
      expect(result.reasoning).toContain('no sources assessed');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Error in LLM call — returns error result
  // ---------------------------------------------------------------------------

  describe('LLM call error', () => {
    it('should return error result when LLM call throws', async () => {
      mockComplete.mockRejectedValue(new Error('LLM provider unavailable'));

      const result = await paradigm.execute(
        'Some claim to verify',
        {},
        { weight: 1.0 }
      );

      expect(result.paradigm).toBe('tool');
      expect(result.verdict).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('LLM provider unavailable');
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return error result when LLM call throws a non-Error', async () => {
      mockComplete.mockRejectedValue('string error');

      const result = await paradigm.execute(
        'Some claim to verify',
        {},
        { weight: 1.0 }
      );

      expect(result.paradigm).toBe('tool');
      expect(result.verdict).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('Unknown error');
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Uses provider/model from options when provided
  // ---------------------------------------------------------------------------

  describe('provider and model from options', () => {
    it('should use provider from options', async () => {
      const result = await paradigm.execute(
        'Test claim',
        {},
        { weight: 1.0, provider: 'anthropic', model: 'claude-sonnet-4-20250514' }
      );

      expect(mockComplete).toHaveBeenCalledWith(
        'anthropic',
        expect.any(Array),
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
        })
      );
      expect(result.paradigm).toBe('tool');
    });

    it('should use default timeout of 30000 when not specified', async () => {
      await paradigm.execute('Test claim', {}, { weight: 1.0 });

      expect(mockComplete).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Array),
        expect.objectContaining({
          timeout: 30000,
        })
      );
    });

    it('should use custom timeout when specified', async () => {
      await paradigm.execute('Test claim', {}, { weight: 1.0, timeout: 60000 });

      expect(mockComplete).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Array),
        expect.objectContaining({
          timeout: 60000,
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Search query extraction
  // ---------------------------------------------------------------------------

  describe('search query extraction', () => {
    it('should prioritize capitalized words and remove stop words', async () => {
      await paradigm.execute(
        'The United Nations was established in 1945 after the end of World War II',
        {},
        { weight: 1.0 }
      );

      // Check what query was sent to Serper
      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      // Capitalized entities and numbers should appear; stop words like "the", "was", "in", "of" removed
      expect(body.q).toContain('United');
      expect(body.q).toContain('Nations');
      expect(body.q).toContain('1945');
      expect(body.q).toContain('World');
      expect(body.q).toContain('War');
      expect(body.q).not.toMatch(/\bthe\b/i);
      expect(body.q).not.toMatch(/\bwas\b/i);
      expect(body.q).not.toMatch(/\bafter\b/i);
    });

    it('should prioritize quoted strings in the query', async () => {
      await paradigm.execute(
        'The phrase "hello world" is commonly used in programming',
        {},
        { weight: 1.0 }
      );

      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.q).toContain('hello world');
    });

    it('should cap query at 15 words', async () => {
      const longContent = Array.from({ length: 30 }, (_, i) => `Word${i}`).join(' ');

      await paradigm.execute(longContent, {}, { weight: 1.0 });

      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const wordCount = body.q.split(/\s+/).length;

      expect(wordCount).toBeLessThanOrEqual(15);
    });
  });

  // ---------------------------------------------------------------------------
  // CLoVE parsing edge cases
  // ---------------------------------------------------------------------------

  describe('CLoVE response parsing edge cases', () => {
    it('should handle malformed JSON gracefully', async () => {
      mockComplete.mockResolvedValue(
        makeLLMResponse('This is not valid JSON at all')
      );

      const result = await paradigm.execute(
        'Some claim',
        {},
        { weight: 1.0 }
      );

      // parseCLoVEResponse returns fallback for empty parsed object
      expect(result.paradigm).toBe('tool');
      expect(result.verdict).toBe('uncertain');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle false verdict correctly', async () => {
      mockComplete.mockResolvedValue(
        makeLLMResponse(
          makeCLoVEResponse({
            verdict: 'false',
            confidence: 0.9,
            sources: [
              { source_index: 1, supports: false, relevance: 0.9, independent: true },
            ],
            contrastive_plausibility: 0.1,
          })
        )
      );

      const result = await paradigm.execute(
        'The moon is made of cheese',
        {},
        { weight: 1.0 }
      );

      expect(result.verdict).toBe('false');
    });

    it('should handle uncertain verdict correctly', async () => {
      mockComplete.mockResolvedValue(
        makeLLMResponse(
          makeCLoVEResponse({
            verdict: 'uncertain',
            confidence: 0.4,
            sources: [],
            contrastive_plausibility: 0.5,
          })
        )
      );

      const result = await paradigm.execute(
        'There might be life on Europa',
        {},
        { weight: 1.0 }
      );

      expect(result.verdict).toBe('uncertain');
    });

    it('should handle contradicting sources that reduce support', async () => {
      mockComplete.mockResolvedValue(
        makeLLMResponse(
          makeCLoVEResponse({
            confidence: 0.6,
            sources: [
              { source_index: 1, supports: true, relevance: 0.9, independent: true },
              { source_index: 2, supports: false, relevance: 0.8, independent: true },
            ],
            contrastive_plausibility: 0.5,
          })
        )
      );

      const result = await paradigm.execute(
        'Disputed claim',
        {},
        { weight: 1.0 }
      );

      // Base 0.6 + 1 * 0.1 = 0.7 (only source 1 is supporting+independent+relevant)
      // contrastive penalty: 0.7 * (1 - 0.5 * 0.3) = 0.7 * 0.85 = 0.595
      expect(result.confidence).toBeCloseTo(0.595, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // Result structure
  // ---------------------------------------------------------------------------

  describe('result structure', () => {
    it('should include all required ParadigmResult fields', async () => {
      const result = await paradigm.execute(
        'Water is H2O',
        {},
        { weight: 0.8 }
      );

      expect(result).toHaveProperty('paradigm', 'tool');
      expect(result).toHaveProperty('weight', 0.8);
      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('verdict');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('processingTimeMs');
      expect(result).toHaveProperty('costCents');
    });

    it('should preserve the weight from options', async () => {
      const result = await paradigm.execute(
        'Test claim',
        {},
        { weight: 0.42 }
      );

      expect(result.weight).toBe(0.42);
    });

    it('should include search query in reasoning', async () => {
      const result = await paradigm.execute(
        'Albert Einstein developed General Relativity in 1915',
        {},
        { weight: 1.0 }
      );

      expect(result.reasoning).toContain('Search query:');
    });

    it('should include contrastive plausibility percentage in reasoning', async () => {
      const result = await paradigm.execute(
        'Test claim',
        {},
        { weight: 1.0 }
      );

      expect(result.reasoning).toContain('Contrastive plausibility:');
      expect(result.reasoning).toMatch(/\d+%/);
    });
  });

  // ---------------------------------------------------------------------------
  // Paradigm identity and factory
  // ---------------------------------------------------------------------------

  describe('paradigm identity', () => {
    it('should have name property set to tool', () => {
      expect(paradigm.name).toBe('tool');
    });
  });
});

describe('createToolParadigm factory', () => {
  it('should create a ToolParadigm instance', () => {
    const p = createToolParadigm({ openai: 'test-key' });

    expect(p).toBeInstanceOf(ToolParadigm);
    expect(p.name).toBe('tool');
  });

  it('should accept multiple provider keys', () => {
    const p = createToolParadigm({
      openai: 'test-openai',
      anthropic: 'test-anthropic',
    });

    expect(p).toBeInstanceOf(ToolParadigm);
  });
});
