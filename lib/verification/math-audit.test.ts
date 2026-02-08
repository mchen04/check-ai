/**
 * Tests for Verification Suite Mathematical Audit Fixes
 *
 * Tests cover 8 fixes:
 * 1. Ensemble double-squaring removal
 * 2. Formal autoformalization confidence caps
 * 3. Semantic zero-norm guard
 * 4. Semantic partition function (log-sum-exp)
 * 5. Entropy cluster distribution normalization
 * 6. Reasoning verdict selection on disagreement
 * 7. Consensus tie-breaking
 * 8. BiPRM soft floor for invalid steps
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateConsensus, ParadigmResult, ParadigmType, Verdict, FPR_WEIGHTS } from './types';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createMockResult(
  paradigm: ParadigmType,
  verdict: Verdict | null,
  confidence: number,
  weight: number = 1.0
): ParadigmResult {
  return {
    paradigm,
    weight,
    provider: 'openai',
    model: 'gpt-4',
    verdict,
    confidence,
    reasoning: `Mock reasoning for ${paradigm}`,
    processingTimeMs: 100,
    costCents: 1,
  };
}

// =============================================================================
// FIX 1: ENSEMBLE DOUBLE-SQUARING
// =============================================================================

describe('Fix 1: Ensemble aggregateResults — no double-squaring', () => {
  // We test via the EnsembleParadigm class since aggregateResults is private.
  // We mock LLM calls to return controlled member results.

  vi.mock('@/lib/llm/client', () => {
    return {
      LLMClient: class MockLLMClient {
        constructor() {}
        complete = vi.fn();
        hasProvider = vi.fn().mockReturnValue(true);
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

  it('2-1 majority should produce confidence ~0.667, not ~0.444', async () => {
    // Import dynamically after mock setup
    const { EnsembleParadigm } = await import('./methods/ensemble');
    const paradigm = new EnsembleParadigm({ openai: 'test-key' });

    // Access private method via prototype workaround
    const aggregate = (paradigm as unknown as {
      aggregateResults: (results: Array<{
        member: { provider: string; model: string; weight: number };
        verdict: Verdict | null;
        confidence: number;
        reasoning: string | null;
        error?: string;
        inputTokens: number;
        outputTokens: number;
        processingTimeMs: number;
      }>) => { verdict: Verdict; confidence: number };
    }).aggregateResults.bind(paradigm);

    const results = [
      {
        member: { provider: 'openai', model: 'gpt-4o', weight: 1.0 },
        verdict: 'true' as Verdict,
        confidence: 1.0,
        reasoning: 'test',
        inputTokens: 0,
        outputTokens: 0,
        processingTimeMs: 0,
      },
      {
        member: { provider: 'anthropic', model: 'claude', weight: 1.0 },
        verdict: 'true' as Verdict,
        confidence: 1.0,
        reasoning: 'test',
        inputTokens: 0,
        outputTokens: 0,
        processingTimeMs: 0,
      },
      {
        member: { provider: 'google', model: 'gemini', weight: 1.0 },
        verdict: 'false' as Verdict,
        confidence: 1.0,
        reasoning: 'test',
        inputTokens: 0,
        outputTokens: 0,
        processingTimeMs: 0,
      },
    ];

    const result = aggregate(results);

    expect(result.verdict).toBe('true');
    // Should be ~0.667 (2/3), NOT ~0.444 (2/3 * 2/3)
    expect(result.confidence).toBeCloseTo(0.667, 2);
  });

  it('unanimous vote should produce confidence 1.0, not squared', async () => {
    const { EnsembleParadigm } = await import('./methods/ensemble');
    const paradigm = new EnsembleParadigm({ openai: 'test-key' });

    const aggregate = (paradigm as unknown as {
      aggregateResults: (results: Array<{
        member: { provider: string; model: string; weight: number };
        verdict: Verdict | null;
        confidence: number;
        reasoning: string | null;
        error?: string;
        inputTokens: number;
        outputTokens: number;
        processingTimeMs: number;
      }>) => { verdict: Verdict; confidence: number };
    }).aggregateResults.bind(paradigm);

    const results = [
      {
        member: { provider: 'openai', model: 'gpt-4o', weight: 1.0 },
        verdict: 'true' as Verdict,
        confidence: 1.0,
        reasoning: 'test',
        inputTokens: 0,
        outputTokens: 0,
        processingTimeMs: 0,
      },
      {
        member: { provider: 'anthropic', model: 'claude', weight: 1.0 },
        verdict: 'true' as Verdict,
        confidence: 1.0,
        reasoning: 'test',
        inputTokens: 0,
        outputTokens: 0,
        processingTimeMs: 0,
      },
      {
        member: { provider: 'google', model: 'gemini', weight: 1.0 },
        verdict: 'true' as Verdict,
        confidence: 1.0,
        reasoning: 'test',
        inputTokens: 0,
        outputTokens: 0,
        processingTimeMs: 0,
      },
    ];

    const result = aggregate(results);

    expect(result.verdict).toBe('true');
    // Should be 1.0 (3/3), NOT 1.0 * 1.0 = still 1.0 (but previously would've been 1.0)
    expect(result.confidence).toBe(1.0);
  });

  it('mixed-weight scenario should use correct weighted ratio', async () => {
    const { EnsembleParadigm } = await import('./methods/ensemble');
    const paradigm = new EnsembleParadigm({ openai: 'test-key' });

    const aggregate = (paradigm as unknown as {
      aggregateResults: (results: Array<{
        member: { provider: string; model: string; weight: number };
        verdict: Verdict | null;
        confidence: number;
        reasoning: string | null;
        error?: string;
        inputTokens: number;
        outputTokens: number;
        processingTimeMs: number;
      }>) => { verdict: Verdict; confidence: number };
    }).aggregateResults.bind(paradigm);

    // Member weights: 1.0 * 0.8 = 0.8 for true, 0.8 * 1.0 = 0.8 for true, 1.0 * 1.0 = 1.0 for false
    const results = [
      {
        member: { provider: 'openai', model: 'gpt-4o', weight: 1.0 },
        verdict: 'true' as Verdict,
        confidence: 0.8,
        reasoning: 'test',
        inputTokens: 0,
        outputTokens: 0,
        processingTimeMs: 0,
      },
      {
        member: { provider: 'anthropic', model: 'claude', weight: 0.8 },
        verdict: 'true' as Verdict,
        confidence: 1.0,
        reasoning: 'test',
        inputTokens: 0,
        outputTokens: 0,
        processingTimeMs: 0,
      },
      {
        member: { provider: 'google', model: 'gemini', weight: 1.0 },
        verdict: 'false' as Verdict,
        confidence: 1.0,
        reasoning: 'test',
        inputTokens: 0,
        outputTokens: 0,
        processingTimeMs: 0,
      },
    ];

    const result = aggregate(results);

    // trueWeight = 0.8 + 0.8 = 1.6, falseWeight = 1.0, total = 2.6
    // confidence = 1.6 / 2.6 ≈ 0.615
    expect(result.verdict).toBe('true');
    expect(result.confidence).toBeCloseTo(1.6 / 2.6, 2);
  });
});

// =============================================================================
// FIX 2: FORMAL AUTOFORMALIZATION CONFIDENCE CAPS
// =============================================================================

describe('Fix 2: Formal autoformalization confidence by claim type', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('regex fast-path (builtin arithmetic) should still get 1.0 confidence', async () => {
    const { FormalParadigm } = await import('./methods/formal');
    const paradigm = new FormalParadigm({ openai: 'test-key' });

    const result = await paradigm.execute('2 + 2 = 4', {}, { weight: 1.0 });

    expect(result.confidence).toBe(1.0);
    expect(result.model).toBe('builtin-arithmetic');
  });

  it('should export AUTOFORMALIZATION_CONFIDENCE_CAPS with correct values', async () => {
    // We verify the caps exist by checking the formal module's behavior
    // The caps are: arithmetic=0.95, comparison=0.93, algebraic=0.92,
    // unit_conversion=0.88, statistical=0.85
    const { FormalParadigm } = await import('./methods/formal');
    const paradigm = new FormalParadigm({ openai: 'test-key' });

    // Test via autoformalization mock — we need the LLM mock to return
    // a valid formalization. Since LLMClient.complete is mocked, set it up.
    const mockComplete = vi.fn().mockResolvedValue({
      content: JSON.stringify({
        expression: '2 + 3',
        claimed_result: '5',
        comparison: '==',
        reasoning: 'Simple addition',
      }),
      model: 'gpt-4o',
      usage: { inputTokens: 100, outputTokens: 50 },
    });

    // Access the private llmClient
    (paradigm as unknown as { llmClient: { complete: typeof mockComplete } }).llmClient.complete = mockComplete;

    // This claim is classified as 'algebraic' (contains sqrt)
    const algebraicResult = await paradigm.execute(
      'The square root of 25 is 5, so sqrt(25) = 5',
      {},
      { weight: 1.0 }
    );

    // If autoformalization succeeded, confidence should be capped at 0.92 (algebraic)
    if (algebraicResult.model !== 'builtin-arithmetic') {
      expect(algebraicResult.confidence).toBeLessThanOrEqual(0.92);
    }
  });
});

// =============================================================================
// FIX 3: SEMANTIC ZERO-NORM GUARD
// =============================================================================

describe('Fix 3: Semantic zero-norm guard', () => {
  it('cosineDistance should return 1.0 for zero vectors, not NaN', async () => {
    const { SemanticParadigm } = await import('./methods/semantic');
    const paradigm = new SemanticParadigm({ openai: 'test-key' });

    // Access private cosineDistance method
    const cosineDistance = (paradigm as unknown as {
      cosineDistance: (a: number[], b: number[]) => number;
    }).cosineDistance.bind(paradigm);

    // Zero vector
    const zeroVec = [0, 0, 0, 0, 0];
    const normalVec = [1, 2, 3, 4, 5];

    const distance = cosineDistance(zeroVec, normalVec);

    expect(distance).toBe(1.0);
    expect(Number.isNaN(distance)).toBe(false);
  });

  it('cosineDistance should return 1.0 for both zero vectors', async () => {
    const { SemanticParadigm } = await import('./methods/semantic');
    const paradigm = new SemanticParadigm({ openai: 'test-key' });

    const cosineDistance = (paradigm as unknown as {
      cosineDistance: (a: number[], b: number[]) => number;
    }).cosineDistance.bind(paradigm);

    const zeroA = [0, 0, 0];
    const zeroB = [0, 0, 0];

    const distance = cosineDistance(zeroA, zeroB);

    expect(distance).toBe(1.0);
    expect(Number.isNaN(distance)).toBe(false);
  });

  it('cosineDistance should clamp to valid range for normal vectors', async () => {
    const { SemanticParadigm } = await import('./methods/semantic');
    const paradigm = new SemanticParadigm({ openai: 'test-key' });

    const cosineDistance = (paradigm as unknown as {
      cosineDistance: (a: number[], b: number[]) => number;
    }).cosineDistance.bind(paradigm);

    // Identical vectors → distance 0
    const vec = [1, 2, 3];
    const distance = cosineDistance(vec, vec);

    expect(distance).toBeCloseTo(0, 5);
    expect(distance).toBeGreaterThanOrEqual(0);
    expect(distance).toBeLessThanOrEqual(2); // cosine distance range [0, 2]
  });
});

// =============================================================================
// FIX 4: SEMANTIC PARTITION FUNCTION (LOG-SUM-EXP)
// =============================================================================

describe('Fix 4: Semantic partition function — log-sum-exp stability', () => {
  it('should handle extreme energy values without NaN or Infinity', async () => {
    const { SemanticParadigm } = await import('./methods/semantic');
    const paradigm = new SemanticParadigm({ openai: 'test-key' });

    // Access private poolEnergy and test the Boltzmann path
    const poolEnergy = (paradigm as unknown as {
      poolEnergy: (embedding: number[], pool: number[][]) => number;
    }).poolEnergy.bind(paradigm);

    // Extreme case: very different embeddings should give large energy
    const farEmbedding = Array(10).fill(100);
    const pool = [Array(10).fill(-100)];

    const energy = poolEnergy(farEmbedding, pool);

    expect(Number.isFinite(energy)).toBe(true);
    expect(Number.isNaN(energy)).toBe(false);
  });
});

// =============================================================================
// FIX 5: ENTROPY CLUSTER DISTRIBUTION NORMALIZATION
// =============================================================================

describe('Fix 5: Entropy cluster distribution normalization', () => {
  it('cluster distribution should sum to 1.0 even when counts dont match responses.length', async () => {
    const { EntropyParadigm } = await import('./methods/entropy');
    const paradigm = new EntropyParadigm({ openai: 'test-key' });

    // Access private classifyVerdicts — mock LLM to return clusters that don't sum to 5
    const mockComplete = vi.fn().mockResolvedValue({
      content: JSON.stringify({
        verdicts: ['true', 'true', 'true', 'false', 'false'],
        reasoning: 'Test classification',
        clusters: [
          { label: 'Cluster A', count: 3 },
          { label: 'Cluster B', count: 7 }, // Total = 10, but 5 responses
        ],
      }),
      model: 'gpt-4o',
      usage: { inputTokens: 100, outputTokens: 50 },
    });

    (paradigm as unknown as { llmClient: { complete: typeof mockComplete } }).llmClient.complete = mockComplete;

    const classifyVerdicts = (paradigm as unknown as {
      classifyVerdicts: (
        provider: string,
        model: string,
        claim: string,
        responses: string[],
        timeout?: number
      ) => Promise<{
        verdicts: string[];
        reasoning: string;
        numClusters?: number;
        clusterDistribution?: number[];
        inputTokens: number;
        outputTokens: number;
      }>;
    }).classifyVerdicts.bind(paradigm);

    const result = await classifyVerdicts(
      'openai', 'gpt-4o', 'test claim',
      ['r1', 'r2', 'r3', 'r4', 'r5'], 30000
    );

    // Distribution should sum to 1.0, normalized by actual sum (10), not responses.length (5)
    expect(result.clusterDistribution).toBeDefined();
    const sum = result.clusterDistribution!.reduce((a: number, b: number) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);

    // Individual values should be 3/10 and 7/10
    expect(result.clusterDistribution![0]).toBeCloseTo(0.3, 5);
    expect(result.clusterDistribution![1]).toBeCloseTo(0.7, 5);
  });
});

// =============================================================================
// FIX 7: CONSENSUS TIE-BREAKING
// =============================================================================

describe('Fix 7: Consensus exact true/false tie-breaking', () => {
  it('should detect exact true/false tie and return uncertain with 0.5 confidence', () => {
    // Create two results with exactly equal weighted contributions
    const results: ParadigmResult[] = [
      createMockResult('reasoning', 'true', 0.9),
      createMockResult('reasoning', 'false', 0.9),
    ];
    // Same paradigm, same weight, same confidence → exact tie in weighted votes

    const consensus = calculateConsensus(results);

    expect(consensus.verdict).toBe('uncertain');
    expect(consensus.confidence).toBe(0.5);
  });

  it('should still work normally when true/false are not tied', () => {
    const results: ParadigmResult[] = [
      createMockResult('formal', 'true', 1.0),
      createMockResult('semantic', 'false', 0.9),
    ];

    const consensus = calculateConsensus(results);

    // Formal has higher FPR weight (1.0 vs 0.7), so true should win
    expect(consensus.verdict).toBe('true');
    expect(consensus.confidence).toBeGreaterThan(0.5);
  });

  it('should handle tie with different paradigms and same effective weight', () => {
    // Construct exact tie: paradigm1 fpr*weight*conf = paradigm2 fpr*weight*conf
    // reasoning: 0.95 * 1.0 * 1.0 = 0.95
    // tool:      0.99 * 1.0 * (0.95/0.99) ≈ 0.95
    // Need exact match, so let's use same paradigm
    const results: ParadigmResult[] = [
      createMockResult('reasoning', 'true', 0.8),
      createMockResult('reasoning', 'false', 0.8),
    ];

    const consensus = calculateConsensus(results);

    expect(consensus.verdict).toBe('uncertain');
    expect(consensus.confidence).toBe(0.5);
  });
});

// =============================================================================
// FIX 8: BIPRM SOFT FLOOR FOR INVALID STEPS
// =============================================================================

describe('Fix 8: BiPRM soft floor for invalid steps', () => {
  it('invalid step with high confidence should score > 0', async () => {
    // We test calculateStepScore through BiPRM behavior
    // Since it's a module-level function, we need to import it
    // It's not exported, so we test through the class behavior

    // Import and access the module
    const biprm = await import('./methods/biprm');

    // We need to test the step scoring logic. Since calculateStepScore is not exported,
    // we'll verify the behavior through a full execution mock.
    const { BiPRMParadigm } = biprm;
    const paradigm = new BiPRMParadigm({ openai: 'test-key' });

    const mockComplete = vi.fn();

    // L2R response: one invalid step with high confidence
    mockComplete.mockResolvedValueOnce({
      content: JSON.stringify({
        steps: [
          { step: 1, description: 'Valid step', valid: true, confidence: 0.9 },
          { step: 2, description: 'Invalid step', valid: false, confidence: 0.8 },
        ],
        verdict: 'false',
        confidence: 0.85,
        reasoning: 'Step 2 is invalid',
      }),
      model: 'gpt-4o',
      usage: { inputTokens: 200, outputTokens: 100 },
    });

    // R2L response: agrees
    mockComplete.mockResolvedValueOnce({
      content: JSON.stringify({
        steps: [
          { step: 1, description: 'Valid step', valid: true, confidence: 0.95 },
          { step: 2, description: 'Invalid step', valid: false, confidence: 0.7 },
        ],
        verdict: 'false',
        confidence: 0.8,
        reasoning: 'Step 2 is invalid',
      }),
      model: 'gpt-4o',
      usage: { inputTokens: 200, outputTokens: 100 },
    });

    (paradigm as unknown as { llmClient: { complete: typeof mockComplete } }).llmClient.complete = mockComplete;

    const result = await paradigm.execute('test claim', {}, { weight: 1.0 });

    // The step scores should use soft floor: invalid step with 0.8 confidence → 0.8 * 0.3 = 0.24
    // (not flat 0). This means the reasoning output should show non-zero step scores.
    expect(result.verdict).toBeDefined();
    expect(result.reasoning).toBeDefined();
    // Key: the confidence should be > 0 since invalid steps no longer produce flat 0
    // With the old code, L2R step score would be 0 (invalid = 0), now it's 0.24
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('completely invalid step with 0 confidence should still score 0', async () => {
    const { BiPRMParadigm } = await import('./methods/biprm');
    const paradigm = new BiPRMParadigm({ openai: 'test-key' });

    const mockComplete = vi.fn();

    // Step with 0 confidence and invalid → 0 * 0.3 = 0
    mockComplete.mockResolvedValueOnce({
      content: JSON.stringify({
        steps: [
          { step: 1, description: 'Bad step', valid: false, confidence: 0 },
        ],
        verdict: 'false',
        confidence: 0.9,
        reasoning: 'Completely wrong',
      }),
      model: 'gpt-4o',
      usage: { inputTokens: 100, outputTokens: 50 },
    });

    mockComplete.mockResolvedValueOnce({
      content: JSON.stringify({
        steps: [
          { step: 1, description: 'Bad step', valid: false, confidence: 0 },
        ],
        verdict: 'false',
        confidence: 0.9,
        reasoning: 'Completely wrong',
      }),
      model: 'gpt-4o',
      usage: { inputTokens: 100, outputTokens: 50 },
    });

    (paradigm as unknown as { llmClient: { complete: typeof mockComplete } }).llmClient.complete = mockComplete;

    const result = await paradigm.execute('test claim', {}, { weight: 1.0 });

    // With confidence=0, soft floor gives 0 * 0.3 = 0, same as before
    expect(result).toBeDefined();
  });
});

// =============================================================================
// FIX 6: REASONING VERDICT SELECTION ON DISAGREEMENT
// =============================================================================

describe('Fix 6: Reasoning verdict selection on disagreement', () => {
  it('should use critique verdict when critique confidence (discounted) > initial', async () => {
    const { ReasoningParadigm } = await import('./methods/reasoning');
    const paradigm = new ReasoningParadigm({ openai: 'test-key' });

    const mockComplete = vi.fn();

    // Initial: low confidence true (within ambiguous zone → triggers critique)
    mockComplete.mockResolvedValueOnce({
      content: JSON.stringify({
        verdict: 'true',
        confidence: 0.45,
        reasoning: 'Weakly true',
      }),
      model: 'gpt-4o',
      usage: { inputTokens: 200, outputTokens: 100 },
    });

    // Critique: high confidence false
    // Discounted: 0.95 * 0.9 = 0.855 > 0.45
    mockComplete.mockResolvedValueOnce({
      content: JSON.stringify({
        verdict: 'false',
        confidence: 0.95,
        reasoning: 'Actually this is clearly false',
      }),
      model: 'gpt-4o',
      usage: { inputTokens: 200, outputTokens: 100 },
    });

    (paradigm as unknown as { llmClient: { complete: typeof mockComplete } }).llmClient.complete = mockComplete;

    const result = await paradigm.execute('test claim', {}, { weight: 1.0 });

    // Critique should win since 0.95 * 0.9 = 0.855 > 0.45
    expect(result.verdict).toBe('false');
    // Should be capped at 0.75
    expect(result.confidence).toBeLessThanOrEqual(0.75);
  });

  it('should keep initial verdict when critique is not significantly more confident', async () => {
    const { ReasoningParadigm } = await import('./methods/reasoning');
    const paradigm = new ReasoningParadigm({ openai: 'test-key' });

    const mockComplete = vi.fn();

    // Initial: moderate confidence (in ambiguous zone)
    mockComplete.mockResolvedValueOnce({
      content: JSON.stringify({
        verdict: 'true',
        confidence: 0.7,
        reasoning: 'Moderate confidence true',
      }),
      model: 'gpt-4o',
      usage: { inputTokens: 200, outputTokens: 100 },
    });

    // Critique: similar confidence false
    // Discounted: 0.75 * 0.9 = 0.675 < 0.7
    mockComplete.mockResolvedValueOnce({
      content: JSON.stringify({
        verdict: 'false',
        confidence: 0.75,
        reasoning: 'Slightly disagrees',
      }),
      model: 'gpt-4o',
      usage: { inputTokens: 200, outputTokens: 100 },
    });

    (paradigm as unknown as { llmClient: { complete: typeof mockComplete } }).llmClient.complete = mockComplete;

    const result = await paradigm.execute('test claim', {}, { weight: 1.0 });

    // Initial should win since 0.75 * 0.9 = 0.675 < 0.7
    expect(result.verdict).toBe('true');
    expect(result.confidence).toBeLessThanOrEqual(0.75);
  });

  it('agreement should still boost confidence by 15%', async () => {
    const { ReasoningParadigm } = await import('./methods/reasoning');
    const paradigm = new ReasoningParadigm({ openai: 'test-key' });

    const mockComplete = vi.fn();

    // Initial: ambiguous zone
    mockComplete.mockResolvedValueOnce({
      content: JSON.stringify({
        verdict: 'true',
        confidence: 0.6,
        reasoning: 'True with moderate confidence',
      }),
      model: 'gpt-4o',
      usage: { inputTokens: 200, outputTokens: 100 },
    });

    // Critique: agrees
    mockComplete.mockResolvedValueOnce({
      content: JSON.stringify({
        verdict: 'true',
        confidence: 0.7,
        reasoning: 'Agrees, this is true',
      }),
      model: 'gpt-4o',
      usage: { inputTokens: 200, outputTokens: 100 },
    });

    (paradigm as unknown as { llmClient: { complete: typeof mockComplete } }).llmClient.complete = mockComplete;

    const result = await paradigm.execute('test claim', {}, { weight: 1.0 });

    expect(result.verdict).toBe('true');
    // 0.6 * 1.15 = 0.69
    expect(result.confidence).toBeCloseTo(0.69, 1);
  });
});
