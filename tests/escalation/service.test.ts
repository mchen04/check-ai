/**
 * Escalation Service Tests
 * Tests escalation creation, resolution, dismissal, and priority logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockParadigmResult, createMockEscalationContext } from '../helpers';

// =============================================================================
// Mocks
// =============================================================================

const mockFindFirst = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

const mockDbChain = {
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  then: undefined as unknown,
};

vi.mock('@/utils/db/db', () => ({
  db: {
    query: {
      escalationsTable: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
    insert: (...args: unknown[]) => {
      mockInsert(...args);
      return mockDbChain;
    },
    update: (...args: unknown[]) => {
      mockUpdate(...args);
      return mockDbChain;
    },
  },
}));

vi.mock('@/utils/db/schema', () => ({
  escalationsTable: { id: 'id', verificationId: 'verificationId' },
}));

const mockSendEscalationAlert = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/email', () => ({
  sendEscalationAlert: (...args: unknown[]) => mockSendEscalationAlert(...args),
}));

const { createEscalation, resolveEscalation, dismissEscalation } = await import(
  '@/lib/escalation/service'
);

// =============================================================================
// createEscalation — reason determination
// =============================================================================

describe('createEscalation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockResolvedValue(null);
  });

  describe('reason determination', () => {
    it('returns model_failure when any paradigm has error', async () => {
      const escalation = { id: 'esc_1', reason: 'model_failure', priority: 3 };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      const context = createMockEscalationContext({
        paradigmResults: [
          createMockParadigmResult({ error: 'Model timeout' }),
          createMockParadigmResult({ verdict: 'true' }),
        ],
      });

      const result = await createEscalation(context);
      expect(result).toBeTruthy();

      // Check the values passed to insert
      const insertValues = mockDbChain.values.mock.calls[0][0];
      expect(insertValues.reason).toBe('model_failure');
    });

    it('returns timeout when timedOut flag is set', async () => {
      const escalation = { id: 'esc_1', reason: 'timeout' };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      const context = createMockEscalationContext({
        timedOut: true,
        paradigmResults: [createMockParadigmResult()],
      });

      const result = await createEscalation(context);
      expect(result).toBeTruthy();

      const insertValues = mockDbChain.values.mock.calls[0][0];
      expect(insertValues.reason).toBe('timeout');
    });

    it('returns conflicting_results when >30% disagreement', async () => {
      const escalation = { id: 'esc_1', reason: 'conflicting_results' };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      // 2 true, 2 false = 50% disagreement > 30%
      const context = createMockEscalationContext({
        paradigmResults: [
          createMockParadigmResult({ verdict: 'true' }),
          createMockParadigmResult({ verdict: 'true' }),
          createMockParadigmResult({ verdict: 'false' }),
          createMockParadigmResult({ verdict: 'false' }),
        ],
      });

      const result = await createEscalation(context);
      expect(result).toBeTruthy();

      const insertValues = mockDbChain.values.mock.calls[0][0];
      expect(insertValues.reason).toBe('conflicting_results');
    });

    it('returns low_confidence (not conflicting) at exactly 30% disagreement (threshold is >)', async () => {
      const escalation = { id: 'esc_1', reason: 'low_confidence' };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      // 3 true, 1 false, 0 uncertain → disagreement = min(3,1)/4 = 0.25 (not > 0.3)
      // Actually need exactly 30%: 7 true, 3 false → min(7,3)/10 = 0.3 → NOT > 0.3
      const context = createMockEscalationContext({
        paradigmResults: [
          createMockParadigmResult({ verdict: 'true' }),
          createMockParadigmResult({ verdict: 'true' }),
          createMockParadigmResult({ verdict: 'true' }),
          createMockParadigmResult({ verdict: 'true' }),
          createMockParadigmResult({ verdict: 'true' }),
          createMockParadigmResult({ verdict: 'true' }),
          createMockParadigmResult({ verdict: 'true' }),
          createMockParadigmResult({ verdict: 'false' }),
          createMockParadigmResult({ verdict: 'false' }),
          createMockParadigmResult({ verdict: 'false' }),
        ],
      });

      await createEscalation(context);
      const insertValues = mockDbChain.values.mock.calls[0][0];
      // min(7,3)/10 = 0.3, which is NOT > 0.3, so should be low_confidence
      expect(insertValues.reason).toBe('low_confidence');
    });

    it('returns low_confidence as default', async () => {
      const escalation = { id: 'esc_1', reason: 'low_confidence' };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      const context = createMockEscalationContext({
        paradigmResults: [
          createMockParadigmResult({ verdict: 'true' }),
          createMockParadigmResult({ verdict: 'true' }),
          createMockParadigmResult({ verdict: 'true' }),
        ],
      });

      const result = await createEscalation(context);
      const insertValues = mockDbChain.values.mock.calls[0][0];
      expect(insertValues.reason).toBe('low_confidence');
    });

    it('prioritizes model_failure > timeout > conflicting', async () => {
      const escalation = { id: 'esc_1', reason: 'model_failure' };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      const context = createMockEscalationContext({
        timedOut: true,
        paradigmResults: [
          createMockParadigmResult({ error: 'Model error', verdict: 'true' }),
          createMockParadigmResult({ verdict: 'false' }),
          createMockParadigmResult({ verdict: 'false' }),
        ],
      });

      await createEscalation(context);
      const insertValues = mockDbChain.values.mock.calls[0][0];
      expect(insertValues.reason).toBe('model_failure');
    });
  });

  // ===========================================================================
  // Priority
  // ===========================================================================

  describe('priority', () => {
    it('returns 3 for errors', async () => {
      const escalation = { id: 'esc_1' };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      const context = createMockEscalationContext({
        confidence: 0.8,
        paradigmResults: [createMockParadigmResult({ error: 'fail' })],
      });

      await createEscalation(context);
      const insertValues = mockDbChain.values.mock.calls[0][0];
      expect(insertValues.priority).toBe(3);
    });

    it('returns 3 for confidence < 0.3', async () => {
      const escalation = { id: 'esc_1' };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      const context = createMockEscalationContext({
        confidence: 0.2,
        paradigmResults: [createMockParadigmResult()],
      });

      await createEscalation(context);
      const insertValues = mockDbChain.values.mock.calls[0][0];
      expect(insertValues.priority).toBe(3);
    });

    it('returns 2 for confidence between 0.3 and 0.5', async () => {
      const escalation = { id: 'esc_1' };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      const context = createMockEscalationContext({
        confidence: 0.4,
        paradigmResults: [createMockParadigmResult()],
      });

      await createEscalation(context);
      const insertValues = mockDbChain.values.mock.calls[0][0];
      expect(insertValues.priority).toBe(2);
    });

    it('returns 1 for confidence >= 0.5', async () => {
      const escalation = { id: 'esc_1' };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      const context = createMockEscalationContext({
        confidence: 0.7,
        paradigmResults: [createMockParadigmResult()],
      });

      await createEscalation(context);
      const insertValues = mockDbChain.values.mock.calls[0][0];
      expect(insertValues.priority).toBe(1);
    });
  });

  // ===========================================================================
  // Deadline
  // ===========================================================================

  describe('deadline', () => {
    it('sets 4h deadline for priority 3', async () => {
      const escalation = { id: 'esc_1' };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      const context = createMockEscalationContext({
        confidence: 0.1,
        paradigmResults: [createMockParadigmResult()],
      });

      const before = Date.now();
      await createEscalation(context);
      const insertValues = mockDbChain.values.mock.calls[0][0];

      expect(insertValues.deadline).toBeInstanceOf(Date);
      const deadlineMs = insertValues.deadline.getTime() - before;
      // Should be approximately 4 hours (within 5s tolerance)
      expect(deadlineMs).toBeGreaterThan(4 * 60 * 60 * 1000 - 5000);
      expect(deadlineMs).toBeLessThan(4 * 60 * 60 * 1000 + 5000);
    });

    it('sets 24h deadline for priority 2', async () => {
      const escalation = { id: 'esc_1' };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      const context = createMockEscalationContext({
        confidence: 0.4,
        paradigmResults: [createMockParadigmResult()],
      });

      const before = Date.now();
      await createEscalation(context);
      const insertValues = mockDbChain.values.mock.calls[0][0];

      expect(insertValues.deadline).toBeInstanceOf(Date);
      const deadlineMs = insertValues.deadline.getTime() - before;
      expect(deadlineMs).toBeGreaterThan(24 * 60 * 60 * 1000 - 5000);
      expect(deadlineMs).toBeLessThan(24 * 60 * 60 * 1000 + 5000);
    });

    it('sets null deadline for priority 1', async () => {
      const escalation = { id: 'esc_1' };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      const context = createMockEscalationContext({
        confidence: 0.7,
        paradigmResults: [createMockParadigmResult()],
      });

      await createEscalation(context);
      const insertValues = mockDbChain.values.mock.calls[0][0];
      expect(insertValues.deadline).toBeNull();
    });
  });

  // ===========================================================================
  // Details
  // ===========================================================================

  describe('details', () => {
    it('counts true/false/uncertain verdicts', async () => {
      const escalation = { id: 'esc_1' };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      const context = createMockEscalationContext({
        paradigmResults: [
          createMockParadigmResult({ verdict: 'true' }),
          createMockParadigmResult({ verdict: 'false' }),
          createMockParadigmResult({ verdict: 'uncertain' }),
        ],
      });

      await createEscalation(context);
      const insertValues = mockDbChain.values.mock.calls[0][0];

      expect(insertValues.details.verdictCounts.true).toBe(1);
      expect(insertValues.details.verdictCounts.false).toBe(1);
      expect(insertValues.details.verdictCounts.uncertain).toBe(1);
    });

    it('calculates disagreement ratio', async () => {
      const escalation = { id: 'esc_1' };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      const context = createMockEscalationContext({
        paradigmResults: [
          createMockParadigmResult({ verdict: 'true' }),
          createMockParadigmResult({ verdict: 'true' }),
          createMockParadigmResult({ verdict: 'false' }),
        ],
      });

      await createEscalation(context);
      const insertValues = mockDbChain.values.mock.calls[0][0];
      // min(2,1) / 3 = 0.333...
      expect(insertValues.details.disagreementRatio).toBeCloseTo(0.333, 2);
    });

    it('sets disagreementRatio = 0 when all verdicts are null', async () => {
      const escalation = { id: 'esc_1' };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      const context = createMockEscalationContext({
        paradigmResults: [
          createMockParadigmResult({ verdict: null }),
          createMockParadigmResult({ verdict: null }),
          createMockParadigmResult({ verdict: null }),
        ],
      });

      await createEscalation(context);
      const insertValues = mockDbChain.values.mock.calls[0][0];

      // validCount = 0 → disagreementRatio = 0
      expect(insertValues.details.disagreementRatio).toBe(0);
      expect(insertValues.details.verdictCounts.true).toBe(0);
      expect(insertValues.details.verdictCounts.false).toBe(0);
      expect(insertValues.details.verdictCounts.uncertain).toBe(0);
    });

    it('includes errors when present', async () => {
      const escalation = { id: 'esc_1' };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      const context = createMockEscalationContext({
        paradigmResults: [
          createMockParadigmResult({ paradigm: 'reasoning', error: 'Timeout' }),
          createMockParadigmResult({ paradigm: 'semantic' }),
        ],
      });

      await createEscalation(context);
      const insertValues = mockDbChain.values.mock.calls[0][0];
      expect(insertValues.details.errors).toHaveLength(1);
      expect(insertValues.details.errors[0].paradigm).toBe('reasoning');
    });
  });

  // ===========================================================================
  // Idempotency
  // ===========================================================================

  describe('idempotency', () => {
    it('returns existing escalation for same verificationId', async () => {
      const existing = { id: 'esc_existing', verificationId: 'ver_test_123' };
      mockFindFirst.mockResolvedValue(existing);

      const context = createMockEscalationContext();
      const result = await createEscalation(context);

      expect(result).toEqual(existing);
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Email
  // ===========================================================================

  describe('email', () => {
    it('sends alert with correct params', async () => {
      const escalation = { id: 'esc_1', reason: 'low_confidence', priority: 2 };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      const context = createMockEscalationContext();
      await createEscalation(context);

      expect(mockSendEscalationAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          escalation: expect.objectContaining({
            id: 'esc_1',
            orgId: 'org_test_123',
          }),
          organizationName: 'Test Organization',
        })
      );
    });

    it('does not fail if email throws', async () => {
      mockSendEscalationAlert.mockRejectedValue(new Error('Email failed'));
      const escalation = { id: 'esc_1' };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      const context = createMockEscalationContext();
      // Should not throw
      const result = await createEscalation(context);
      expect(result).toBeTruthy();
    });

    it('skips email when orgId missing', async () => {
      const escalation = { id: 'esc_1' };
      mockDbChain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve([escalation]).then(resolve);

      const context = createMockEscalationContext({ orgId: undefined });
      await createEscalation(context);

      expect(mockSendEscalationAlert).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// resolveEscalation
// =============================================================================

describe('resolveEscalation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates with verdict and resolver', async () => {
    const updated = { id: 'esc_1', resolvedBy: 'user_1', humanVerdict: 'true' };
    mockDbChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([updated]).then(resolve);

    const result = await resolveEscalation('esc_1', 'user_1', 'true', 'Content is accurate');
    expect(result).toEqual(updated);
    expect(mockDbChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        resolvedBy: 'user_1',
        humanVerdict: 'true',
        resolution: 'Content is accurate',
      })
    );
  });

  it('returns null when not found', async () => {
    mockDbChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);

    const result = await resolveEscalation('nonexistent', 'user_1', 'true');
    expect(result).toBeNull();
  });
});

// =============================================================================
// dismissEscalation
// =============================================================================

describe('dismissEscalation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets default resolution text', async () => {
    const updated = { id: 'esc_1', resolution: 'Dismissed as false positive' };
    mockDbChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([updated]).then(resolve);

    await dismissEscalation('esc_1', 'user_1');
    expect(mockDbChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        resolution: 'Dismissed as false positive',
      })
    );
  });

  it('uses provided text', async () => {
    const updated = { id: 'esc_1', resolution: 'Custom reason' };
    mockDbChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([updated]).then(resolve);

    await dismissEscalation('esc_1', 'user_1', 'Custom reason');
    expect(mockDbChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        resolution: 'Custom reason',
      })
    );
  });

  it('returns null when not found', async () => {
    mockDbChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);

    const result = await dismissEscalation('nonexistent', 'user_1');
    expect(result).toBeNull();
  });
});
