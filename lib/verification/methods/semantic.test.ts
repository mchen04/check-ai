/**
 * Tests for Semantic Verification Method
 * Tests Boltzmann energy-based embedding verification, caching, and error handling
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { SemanticParadigm, createSemanticParadigm } from './semantic';

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock embedding vectors (3D for simplicity)
// Truth reference embeddings: oriented along the x-axis
const TRUTH_REFS: number[][] = [
  [1, 0, 0],
  [0.9, 0.1, 0],
  [0.8, 0.2, 0],
];
// Falsehood reference embeddings: oriented along the y-axis
const FALSE_REFS: number[][] = [
  [0, 1, 0],
  [0.1, 0.9, 0],
  [0.2, 0.8, 0],
];
// All reference embeddings in the order they are batched (truth first, then false)
const ALL_REFS = [...TRUTH_REFS, ...FALSE_REFS];

// Content embeddings for different scenarios
const CONTENT_CLOSE_TO_TRUTH: number[] = [0.95, 0.05, 0];
const CONTENT_CLOSE_TO_FALSE: number[] = [0.05, 0.95, 0];
const CONTENT_AMBIGUOUS: number[] = [0.5, 0.5, 0];

// Mock LLMClient instance methods
const mockGetEmbedding = vi.fn();
const mockGetDefaultModel = vi.fn().mockReturnValue('text-embedding-3-small');
const mockHasProvider = vi.fn().mockReturnValue(true);

vi.mock('@/lib/llm', () => ({
  LLMClient: class MockLLMClient {
    constructor() {}
    getEmbedding = mockGetEmbedding;
    getDefaultModel = mockGetDefaultModel;
    hasProvider = mockHasProvider;
  },
  calculateCostCents: vi.fn().mockReturnValue(0),
}));

const mockSelectBestEmbeddingProvider = vi.fn();
const mockCreateParadigmErrorResult = vi.fn();

vi.mock('./shared', () => ({
  selectBestEmbeddingProvider: (...args: unknown[]) => mockSelectBestEmbeddingProvider(...args),
  createParadigmErrorResult: (...args: unknown[]) => mockCreateParadigmErrorResult(...args),
  EMBEDDING_PROVIDER_PREFERENCE: ['openai', 'google', 'mistral'],
}));

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Set up mockGetEmbedding so the first call returns all reference embeddings
 * and the second call returns the given content embedding.
 */
function setupEmbeddingMocks(contentEmbedding: number[]) {
  let callCount = 0;
  mockGetEmbedding.mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      // Reference embeddings batch call (6 texts)
      return Promise.resolve({ embeddings: ALL_REFS });
    }
    // Content embedding call (single text)
    return Promise.resolve({ embeddings: [contentEmbedding] });
  });
}

const DEFAULT_OPTIONS = { weight: 1.0 };
const DEFAULT_CONTEXT = {};

// =============================================================================
// TESTS
// =============================================================================

describe('SemanticParadigm', () => {
  let paradigm: SemanticParadigm;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectBestEmbeddingProvider.mockReturnValue('openai');
    mockCreateParadigmErrorResult.mockImplementation(
      (paradigmName, weight, provider, model, processingTimeMs, error) => ({
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
    paradigm = new SemanticParadigm({ openai: 'test-key' });
  });

  // ---------------------------------------------------------------------------
  // 1. Constructor
  // ---------------------------------------------------------------------------

  describe('Constructor', () => {
    it('should create an LLMClient and set the name', () => {
      const p = new SemanticParadigm({ openai: 'test-key' });
      expect(p.name).toBe('semantic');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. No embedding provider available
  // ---------------------------------------------------------------------------

  describe('No embedding provider', () => {
    it('should return an error result when no embedding provider is available', async () => {
      mockSelectBestEmbeddingProvider.mockReturnValue(null);

      const result = await paradigm.execute('test content', DEFAULT_CONTEXT, DEFAULT_OPTIONS);

      expect(mockCreateParadigmErrorResult).toHaveBeenCalledOnce();
      expect(result.verdict).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.error).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Strong truth signal
  // ---------------------------------------------------------------------------

  describe('Truth verdict', () => {
    it('should return verdict "true" when content embedding is close to truth references', async () => {
      setupEmbeddingMocks(CONTENT_CLOSE_TO_TRUTH);

      const result = await paradigm.execute(
        'This is a true statement',
        DEFAULT_CONTEXT,
        DEFAULT_OPTIONS
      );

      expect(result.paradigm).toBe('semantic');
      expect(result.verdict).toBe('true');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning).toContain('P(truth)');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Strong false signal
  // ---------------------------------------------------------------------------

  describe('False verdict', () => {
    it('should return verdict "false" when content embedding is close to falsehood references', async () => {
      setupEmbeddingMocks(CONTENT_CLOSE_TO_FALSE);

      const result = await paradigm.execute(
        'This is a false statement',
        DEFAULT_CONTEXT,
        DEFAULT_OPTIONS
      );

      expect(result.paradigm).toBe('semantic');
      expect(result.verdict).toBe('false');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning).toContain('P(false)');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Ambiguous / uncertain signal
  // ---------------------------------------------------------------------------

  describe('Uncertain verdict', () => {
    it('should return verdict "uncertain" when content embedding is equidistant from truth and falsehood', async () => {
      setupEmbeddingMocks(CONTENT_AMBIGUOUS);

      const result = await paradigm.execute(
        'This is an ambiguous statement',
        DEFAULT_CONTEXT,
        DEFAULT_OPTIONS
      );

      expect(result.paradigm).toBe('semantic');
      expect(result.verdict).toBe('uncertain');
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Embedding caching
  // ---------------------------------------------------------------------------

  describe('Reference embedding caching', () => {
    it('should cache reference embeddings and not re-fetch on second call', async () => {
      // First call: reference embeddings (batch) + content embedding = 2 getEmbedding calls
      let callCount = 0;
      mockGetEmbedding.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ embeddings: ALL_REFS });
        }
        // All subsequent calls return a content embedding
        return Promise.resolve({ embeddings: [CONTENT_CLOSE_TO_TRUTH] });
      });

      await paradigm.execute('first call', DEFAULT_CONTEXT, DEFAULT_OPTIONS);
      expect(mockGetEmbedding).toHaveBeenCalledTimes(2);

      // Second call: should only need 1 getEmbedding call (content only, refs cached)
      await paradigm.execute('second call', DEFAULT_CONTEXT, DEFAULT_OPTIONS);
      expect(mockGetEmbedding).toHaveBeenCalledTimes(3); // 2 + 1, not 2 + 2
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Confidence cap at MAX_CONFIDENCE (0.85)
  // ---------------------------------------------------------------------------

  describe('Confidence cap', () => {
    it('should cap confidence at 0.85 (MAX_CONFIDENCE)', async () => {
      // Use an embedding extremely close to truth to push confidence high
      const extremeTruth = [1.0, 0.0, 0.0];
      setupEmbeddingMocks(extremeTruth);

      const result = await paradigm.execute(
        'Extremely true content',
        DEFAULT_CONTEXT,
        DEFAULT_OPTIONS
      );

      expect(result.confidence).toBeLessThanOrEqual(0.85);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Error handling — getEmbedding fails
  // ---------------------------------------------------------------------------

  describe('Error handling', () => {
    it('should return an error result when getEmbedding throws', async () => {
      mockGetEmbedding.mockRejectedValue(new Error('Embedding API failed'));

      const result = await paradigm.execute(
        'some content',
        DEFAULT_CONTEXT,
        DEFAULT_OPTIONS
      );

      expect(mockCreateParadigmErrorResult).toHaveBeenCalledOnce();
      expect(result.verdict).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.error).toContain('Embedding API failed');
    });

    it('should return an error result when getEmbedding returns null', async () => {
      mockGetEmbedding.mockResolvedValue(null);

      const result = await paradigm.execute(
        'some content',
        DEFAULT_CONTEXT,
        DEFAULT_OPTIONS
      );

      expect(mockCreateParadigmErrorResult).toHaveBeenCalledOnce();
      expect(result.verdict).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should return an error result when reference embedding count is wrong', async () => {
      // Return too few embeddings for the reference batch
      mockGetEmbedding.mockResolvedValue({ embeddings: [[1, 0, 0]] });

      const result = await paradigm.execute(
        'some content',
        DEFAULT_CONTEXT,
        DEFAULT_OPTIONS
      );

      expect(mockCreateParadigmErrorResult).toHaveBeenCalledOnce();
      expect(result.verdict).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Result structure
  // ---------------------------------------------------------------------------

  describe('Result structure', () => {
    it('should include all required ParadigmResult fields', async () => {
      setupEmbeddingMocks(CONTENT_CLOSE_TO_TRUTH);

      const result = await paradigm.execute(
        'test content',
        DEFAULT_CONTEXT,
        { weight: 0.7 }
      );

      expect(result).toHaveProperty('paradigm', 'semantic');
      expect(result).toHaveProperty('weight', 0.7);
      expect(result).toHaveProperty('provider', 'openai');
      expect(result).toHaveProperty('model', 'embedding-openai');
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
      setupEmbeddingMocks(CONTENT_CLOSE_TO_TRUTH);

      const result = await paradigm.execute(
        'test content',
        DEFAULT_CONTEXT,
        { weight: 0.42 }
      );

      expect(result.weight).toBe(0.42);
    });

    it('should have valid processing time', async () => {
      setupEmbeddingMocks(CONTENT_CLOSE_TO_TRUTH);

      const result = await paradigm.execute(
        'test content',
        DEFAULT_CONTEXT,
        DEFAULT_OPTIONS
      );

      expect(typeof result.processingTimeMs).toBe('number');
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should set outputTokens to 0 for embedding-only method', async () => {
      setupEmbeddingMocks(CONTENT_CLOSE_TO_TRUTH);

      const result = await paradigm.execute(
        'test content',
        DEFAULT_CONTEXT,
        DEFAULT_OPTIONS
      );

      expect(result.tokenUsage?.outputTokens).toBe(0);
    });
  });
});

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

describe('createSemanticParadigm factory', () => {
  it('should create a SemanticParadigm instance', () => {
    const paradigm = createSemanticParadigm({ openai: 'test-key' });

    expect(paradigm).toBeInstanceOf(SemanticParadigm);
    expect(paradigm.name).toBe('semantic');
  });

  it('should accept multiple provider keys', () => {
    const paradigm = createSemanticParadigm({
      openai: 'test-openai',
      google: 'test-google',
    });

    expect(paradigm).toBeInstanceOf(SemanticParadigm);
  });
});
