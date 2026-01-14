/**
 * Tests for Verification Types
 * Tests for consensus calculation, decision determination, and threshold resolution
 */

import { describe, it, expect } from 'vitest';
import {
  calculateConsensus,
  determineDecision,
  resolveThresholds,
  createErrorParadigmResult,
  FPR_WEIGHTS,
  DECISION_THRESHOLDS,
  ParadigmResult,
  ParadigmType,
  Verdict,
} from './types';

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
// FPR_WEIGHTS TESTS
// =============================================================================

describe('FPR_WEIGHTS', () => {
  it('should have weights for all paradigm types', () => {
    const paradigms: ParadigmType[] = [
      'semantic',
      'reasoning',
      'tool',
      'biprm',
      'ensemble',
      'entropy',
      'formal',
    ];

    for (const paradigm of paradigms) {
      expect(FPR_WEIGHTS[paradigm]).toBeDefined();
      expect(typeof FPR_WEIGHTS[paradigm]).toBe('number');
      expect(FPR_WEIGHTS[paradigm]).toBeGreaterThanOrEqual(0);
      expect(FPR_WEIGHTS[paradigm]).toBeLessThanOrEqual(1);
    }
  });

  it('should have formal with highest weight (lowest FPR)', () => {
    expect(FPR_WEIGHTS.formal).toBe(1.0);
  });

  it('should have semantic with lowest weight (highest FPR)', () => {
    expect(FPR_WEIGHTS.semantic).toBe(0.3);
  });

  it('should have tool weighted higher than reasoning', () => {
    expect(FPR_WEIGHTS.tool).toBeGreaterThan(FPR_WEIGHTS.reasoning);
  });
});

// =============================================================================
// DECISION_THRESHOLDS TESTS
// =============================================================================

describe('DECISION_THRESHOLDS', () => {
  it('should have all required threshold levels', () => {
    expect(DECISION_THRESHOLDS.accept).toBeDefined();
    expect(DECISION_THRESHOLDS.refine).toBeDefined();
    expect(DECISION_THRESHOLDS.escalate).toBeDefined();
    expect(DECISION_THRESHOLDS.reject).toBeDefined();
  });

  it('should have thresholds in descending order', () => {
    expect(DECISION_THRESHOLDS.accept).toBeGreaterThan(DECISION_THRESHOLDS.refine);
    expect(DECISION_THRESHOLDS.refine).toBeGreaterThan(DECISION_THRESHOLDS.escalate);
    expect(DECISION_THRESHOLDS.escalate).toBeGreaterThan(DECISION_THRESHOLDS.reject);
  });

  it('should have accept threshold at 0.95', () => {
    expect(DECISION_THRESHOLDS.accept).toBe(0.95);
  });
});

// =============================================================================
// resolveThresholds TESTS
// =============================================================================

describe('resolveThresholds', () => {
  it('should return defaults when no options provided', () => {
    const thresholds = resolveThresholds();

    expect(thresholds.accept).toBe(DECISION_THRESHOLDS.accept);
    expect(thresholds.refine).toBe(DECISION_THRESHOLDS.refine);
    expect(thresholds.escalate).toBe(DECISION_THRESHOLDS.escalate);
    expect(thresholds.reject).toBe(DECISION_THRESHOLDS.reject);
  });

  it('should return defaults when empty options provided', () => {
    const thresholds = resolveThresholds({});

    expect(thresholds.accept).toBe(DECISION_THRESHOLDS.accept);
    expect(thresholds.escalate).toBe(DECISION_THRESHOLDS.escalate);
  });

  it('should override acceptThreshold when provided', () => {
    const thresholds = resolveThresholds({ acceptThreshold: 0.9 });

    expect(thresholds.accept).toBe(0.9);
    expect(thresholds.escalate).toBe(DECISION_THRESHOLDS.escalate);
  });

  it('should override escalateThreshold when provided', () => {
    const thresholds = resolveThresholds({ escalateThreshold: 0.4 });

    expect(thresholds.accept).toBe(DECISION_THRESHOLDS.accept);
    expect(thresholds.escalate).toBe(0.4);
  });

  it('should override both thresholds when provided', () => {
    const thresholds = resolveThresholds({
      acceptThreshold: 0.85,
      escalateThreshold: 0.45,
    });

    expect(thresholds.accept).toBe(0.85);
    expect(thresholds.escalate).toBe(0.45);
  });

  it('should not allow user to override refine or reject thresholds', () => {
    const thresholds = resolveThresholds({
      acceptThreshold: 0.9,
      escalateThreshold: 0.4,
    });

    expect(thresholds.refine).toBe(DECISION_THRESHOLDS.refine);
    expect(thresholds.reject).toBe(DECISION_THRESHOLDS.reject);
  });
});

// =============================================================================
// calculateConsensus TESTS
// =============================================================================

describe('calculateConsensus', () => {
  describe('with no results', () => {
    it('should return uncertain with 0 confidence for empty array', () => {
      const consensus = calculateConsensus([]);

      expect(consensus.verdict).toBe('uncertain');
      expect(consensus.confidence).toBe(0);
      expect(consensus.reasoning).toBe('No valid paradigm results available');
    });
  });

  describe('with all null verdicts', () => {
    it('should return uncertain when all verdicts are null', () => {
      const results: ParadigmResult[] = [
        createMockResult('reasoning', null, 0),
        createMockResult('tool', null, 0),
      ];

      const consensus = calculateConsensus(results);

      expect(consensus.verdict).toBe('uncertain');
      expect(consensus.confidence).toBe(0);
    });
  });

  describe('with error results', () => {
    it('should filter out error results', () => {
      const results: ParadigmResult[] = [
        createMockResult('reasoning', 'true', 0.9),
        { ...createMockResult('tool', 'false', 0.8), error: 'Some error' },
      ];

      const consensus = calculateConsensus(results);

      expect(consensus.verdict).toBe('true');
    });
  });

  describe('with unanimous true verdicts', () => {
    it('should return true with high confidence', () => {
      const results: ParadigmResult[] = [
        createMockResult('reasoning', 'true', 0.9),
        createMockResult('tool', 'true', 0.95),
        createMockResult('formal', 'true', 1.0),
      ];

      const consensus = calculateConsensus(results);

      expect(consensus.verdict).toBe('true');
      expect(consensus.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('with unanimous false verdicts', () => {
    it('should return false with high confidence', () => {
      const results: ParadigmResult[] = [
        createMockResult('reasoning', 'false', 0.95),
        createMockResult('tool', 'false', 0.9),
        createMockResult('biprm', 'false', 0.85),
      ];

      const consensus = calculateConsensus(results);

      expect(consensus.verdict).toBe('false');
      expect(consensus.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('with mixed verdicts', () => {
    it('should return the verdict with higher weighted votes', () => {
      const results: ParadigmResult[] = [
        createMockResult('formal', 'true', 1.0), // High FPR weight
        createMockResult('semantic', 'false', 0.9), // Low FPR weight
      ];

      const consensus = calculateConsensus(results);

      // Formal has much higher FPR weight, so true should win
      expect(consensus.verdict).toBe('true');
    });

    it('should return uncertain when votes are evenly split', () => {
      const results: ParadigmResult[] = [
        createMockResult('reasoning', 'uncertain', 0.5),
        createMockResult('tool', 'uncertain', 0.5),
      ];

      const consensus = calculateConsensus(results);

      expect(consensus.verdict).toBe('uncertain');
    });
  });

  describe('weight calculations', () => {
    it('should factor in paradigm weights', () => {
      const results: ParadigmResult[] = [
        createMockResult('reasoning', 'true', 0.9, 1.0), // Full weight
        createMockResult('tool', 'false', 0.9, 0.1), // Very low weight
      ];

      const consensus = calculateConsensus(results);

      // Even though tool is more accurate by FPR, the low weight should make true win
      expect(consensus.verdict).toBe('true');
    });

    it('should factor in confidence scores', () => {
      const results: ParadigmResult[] = [
        createMockResult('reasoning', 'true', 0.1), // Low confidence
        createMockResult('reasoning', 'false', 0.99), // High confidence
      ];

      const consensus = calculateConsensus(results);

      expect(consensus.verdict).toBe('false');
    });
  });

  describe('reasoning generation', () => {
    it('should include paradigm summaries in reasoning', () => {
      const results: ParadigmResult[] = [
        createMockResult('reasoning', 'true', 0.9),
        createMockResult('tool', 'true', 0.85),
      ];

      const consensus = calculateConsensus(results);

      expect(consensus.reasoning).toContain('[reasoning]');
      expect(consensus.reasoning).toContain('[tool]');
      expect(consensus.reasoning).toContain('true');
    });
  });
});

// =============================================================================
// determineDecision TESTS
// =============================================================================

describe('determineDecision', () => {
  describe('accept decision', () => {
    it('should accept when confidence >= accept threshold and verdict is not uncertain', () => {
      const results = [createMockResult('reasoning', 'true', 0.95)];
      const decision = determineDecision('true', 0.96, results);

      expect(decision).toBe('accept');
    });

    it('should accept for false verdict with high confidence', () => {
      const results = [createMockResult('reasoning', 'false', 0.95)];
      const decision = determineDecision('false', 0.96, results);

      expect(decision).toBe('accept');
    });

    it('should not accept uncertain verdict even with high confidence', () => {
      const results = [createMockResult('reasoning', 'uncertain', 0.95)];
      const decision = determineDecision('uncertain', 0.96, results);

      expect(decision).not.toBe('accept');
    });
  });

  describe('refine decision', () => {
    it('should refine when confidence is between refine and accept thresholds', () => {
      const results = [createMockResult('reasoning', 'true', 0.8)];
      const decision = determineDecision('true', 0.8, results);

      expect(decision).toBe('refine');
    });

    it('should refine when confidence is exactly at refine threshold', () => {
      const results = [createMockResult('reasoning', 'true', 0.7)];
      const decision = determineDecision('true', 0.7, results);

      expect(decision).toBe('refine');
    });
  });

  describe('escalate decision', () => {
    it('should escalate when confidence is low and disagreement is high', () => {
      const results = [
        createMockResult('reasoning', 'true', 0.6),
        createMockResult('tool', 'false', 0.6),
        createMockResult('biprm', 'true', 0.5),
      ];

      // 2 true, 1 false = 1/3 = 0.33 disagreement ratio (> 0.3)
      const decision = determineDecision('true', 0.5, results);

      expect(decision).toBe('escalate');
    });

    it('should escalate when paradigms strongly disagree', () => {
      const results = [
        createMockResult('reasoning', 'true', 0.9),
        createMockResult('tool', 'false', 0.9),
      ];

      const decision = determineDecision('uncertain', 0.5, results);

      expect(decision).toBe('escalate');
    });
  });

  describe('reject decision', () => {
    it('should reject when confidence is low with agreement', () => {
      const results = [
        createMockResult('reasoning', 'false', 0.4),
        createMockResult('tool', 'false', 0.4),
        createMockResult('biprm', 'false', 0.4),
      ];

      // All false = 0% disagreement
      const decision = determineDecision('false', 0.4, results);

      expect(decision).toBe('reject');
    });
  });

  describe('with custom thresholds', () => {
    it('should use custom accept threshold', () => {
      const results = [createMockResult('reasoning', 'true', 0.85)];
      const customThresholds = {
        accept: 0.8,
        refine: 0.7,
        escalate: 0.5,
        reject: 0.3,
      };

      const decision = determineDecision('true', 0.85, results, customThresholds);

      expect(decision).toBe('accept');
    });

    it('should use custom escalate threshold', () => {
      const results = [
        createMockResult('reasoning', 'true', 0.6),
        createMockResult('tool', 'false', 0.6),
      ];
      const customThresholds = {
        accept: 0.95,
        refine: 0.7,
        escalate: 0.3, // Very low, so should escalate less
        reject: 0.1,
      };

      const decision = determineDecision('uncertain', 0.5, results, customThresholds);

      expect(decision).toBe('escalate');
    });
  });
});

// =============================================================================
// createErrorParadigmResult TESTS
// =============================================================================

describe('createErrorParadigmResult', () => {
  it('should create result with null verdict', () => {
    const result = createErrorParadigmResult('reasoning', 1.0, new Error('Test error'));

    expect(result.verdict).toBeNull();
  });

  it('should create result with 0 confidence', () => {
    const result = createErrorParadigmResult('reasoning', 1.0, new Error('Test error'));

    expect(result.confidence).toBe(0);
  });

  it('should preserve the paradigm type', () => {
    const result = createErrorParadigmResult('tool', 0.8, new Error('Test error'));

    expect(result.paradigm).toBe('tool');
  });

  it('should preserve the weight', () => {
    const result = createErrorParadigmResult('reasoning', 0.5, new Error('Test error'));

    expect(result.weight).toBe(0.5);
  });

  it('should extract error message from Error object', () => {
    const result = createErrorParadigmResult(
      'reasoning',
      1.0,
      new Error('Something went wrong')
    );

    expect(result.error).toBe('Something went wrong');
  });

  it('should handle non-Error objects', () => {
    const result = createErrorParadigmResult('reasoning', 1.0, 'string error');

    expect(result.error).toBe('Unknown error');
  });

  it('should handle null/undefined errors', () => {
    const result = createErrorParadigmResult('reasoning', 1.0, null);

    expect(result.error).toBe('Unknown error');
  });

  it('should set processing time to 0', () => {
    const result = createErrorParadigmResult('reasoning', 1.0, new Error('Test'));

    expect(result.processingTimeMs).toBe(0);
  });

  it('should set cost to 0', () => {
    const result = createErrorParadigmResult('reasoning', 1.0, new Error('Test'));

    expect(result.costCents).toBe(0);
  });

  it('should set provider to openai as default', () => {
    const result = createErrorParadigmResult('reasoning', 1.0, new Error('Test'));

    expect(result.provider).toBe('openai');
  });

  it('should set model to unknown', () => {
    const result = createErrorParadigmResult('reasoning', 1.0, new Error('Test'));

    expect(result.model).toBe('unknown');
  });

  it('should set reasoning to null', () => {
    const result = createErrorParadigmResult('reasoning', 1.0, new Error('Test'));

    expect(result.reasoning).toBeNull();
  });
});
