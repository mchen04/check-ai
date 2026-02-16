/**
 * Batch Service Tests
 * Tests batch creation, retrieval, cancellation, and formatting
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockBatchJob, createMockBatchItem } from '../helpers';

// =============================================================================
// Mocks
// =============================================================================

const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbUpdate = vi.fn();

const mockSelectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  then: undefined as unknown,
};

const mockInsertValues = vi.fn();
const mockInsertChain = {
  values: (...args: unknown[]) => {
    mockInsertValues(...args);
    return mockInsertChain;
  },
  returning: vi.fn().mockReturnThis(),
  then: undefined as unknown,
};

const mockUpdateChain = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  then: undefined as unknown,
};

vi.mock('@/utils/db/db', () => ({
  db: {
    select: (...args: unknown[]) => {
      mockDbSelect(...args);
      return mockSelectChain;
    },
    insert: (...args: unknown[]) => {
      mockDbInsert(...args);
      return mockInsertChain;
    },
    update: (...args: unknown[]) => {
      mockDbUpdate(...args);
      return mockUpdateChain;
    },
  },
}));

vi.mock('@/utils/db/schema', () => ({
  batchJobsTable: { id: 'id', orgId: 'orgId', status: 'status', createdAt: 'createdAt' },
  batchItemsTable: { id: 'id', batchId: 'batchId', status: 'status', itemIndex: 'itemIndex' },
  verificationsTable: {},
  paradigmResultsTable: {},
}));

const mockCreateAuditLog = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/audit', () => ({
  createAuditLog: (...args: unknown[]) => mockCreateAuditLog(...args),
}));

const mockQueueBatchItems = vi.fn().mockResolvedValue(undefined);
const mockCancelBatchItems = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/batch/trigger', () => ({
  queueBatchItems: (...args: unknown[]) => mockQueueBatchItems(...args),
  cancelBatchItems: (...args: unknown[]) => mockCancelBatchItems(...args),
}));

// Need to also mock the types module which the source imports
vi.mock('@/lib/batch/types', async () => {
  const actual = await vi.importActual('@/lib/batch/types');
  return actual;
});

const {
  createBatch,
  getBatch,
  listBatches,
  getBatchResults,
  cancelBatch,
  getBatchItem,
} = await import('@/lib/batch/service');

// =============================================================================
// createBatch
// =============================================================================

describe('createBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);
  });

  it('creates failed batch for validation errors', async () => {
    const batch = createMockBatchJob({ status: 'failed' });
    mockInsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([batch]).then(resolve);

    const result = await createBatch('org_1', { methods: { semantic: 1 } } as any, [
      { content: '' }, // empty content
    ]);

    expect(result.validationErrors.length).toBeGreaterThan(0);
    expect(result.validationErrors[0].error).toContain('Content is required');
  });

  it('creates failed batch for oversized content', async () => {
    const batch = createMockBatchJob({ status: 'failed' });
    mockInsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([batch]).then(resolve);

    const result = await createBatch('org_1', { methods: { semantic: 1 } } as any, [
      { content: 'x'.repeat(50001) },
    ]);

    expect(result.validationErrors.length).toBeGreaterThan(0);
    expect(result.validationErrors[0].error).toContain('maximum length');
  });

  it('creates batch and queues items on success', async () => {
    const batch = createMockBatchJob({ id: 'batch_new' });
    const items = [{ id: 'item_1', itemIndex: 0, content: 'test', itemContext: null }];

    let insertCount = 0;
    mockInsertChain.then = (resolve: (v: unknown) => unknown) => {
      insertCount++;
      if (insertCount === 1) return Promise.resolve([batch]).then(resolve);
      return Promise.resolve(items).then(resolve);
    };

    const result = await createBatch(
      'org_1',
      { methods: { semantic: 1 }, name: 'Test Batch' } as any,
      [{ content: 'Test content' }]
    );

    expect(result.batchId).toBe('batch_new');
    expect(result.validationErrors).toEqual([]);
    expect(mockQueueBatchItems).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalled();
  });

  it('collects all validation errors for mixed valid + invalid items', async () => {
    const batch = createMockBatchJob({ status: 'failed' });
    mockInsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([batch]).then(resolve);

    const result = await createBatch('org_1', { methods: { semantic: 1 } } as any, [
      { content: 'valid content' },
      { content: '' }, // empty
      { content: 'also valid' },
      { content: 'x'.repeat(50001) }, // oversized
    ]);

    expect(result.validationErrors).toHaveLength(2);
    expect(result.validationErrors[0].row).toBe(2); // 1-indexed
    expect(result.validationErrors[0].error).toContain('Content is required');
    expect(result.validationErrors[1].row).toBe(4);
    expect(result.validationErrors[1].error).toContain('maximum length');
  });

  it('rejects whitespace-only content', async () => {
    const batch = createMockBatchJob({ status: 'failed' });
    mockInsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([batch]).then(resolve);

    const result = await createBatch('org_1', { methods: { semantic: 1 } } as any, [
      { content: '   \t\n  ' }, // whitespace only
    ]);

    expect(result.validationErrors).toHaveLength(1);
    expect(result.validationErrors[0].error).toContain('Content is required');
  });

  it('marks batch failed when queuing fails', async () => {
    const batch = createMockBatchJob({ id: 'batch_fail' });
    const items = [{ id: 'item_1', itemIndex: 0, content: 'test', itemContext: null }];

    let insertCount = 0;
    mockInsertChain.then = (resolve: (v: unknown) => unknown) => {
      insertCount++;
      if (insertCount === 1) return Promise.resolve([batch]).then(resolve);
      return Promise.resolve(items).then(resolve);
    };

    mockQueueBatchItems.mockRejectedValue(new Error('Queue failed'));
    mockUpdateChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);

    await expect(
      createBatch('org_1', { methods: { semantic: 1 } } as any, [{ content: 'test' }])
    ).rejects.toThrow('Queue failed');

    expect(mockDbUpdate).toHaveBeenCalled();
  });
});

// =============================================================================
// getBatch
// =============================================================================

describe('getBatch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns formatted batch when found', async () => {
    const batch = createMockBatchJob();
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([batch]).then(resolve);

    const result = await getBatch('batch_test_123', 'org_test_123');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('batch_test_123');
    expect(result!.progress).toBe(0);
    expect(result!.createdAt).toBe(batch.createdAt.toISOString());
  });

  it('returns null when not found', async () => {
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);

    const result = await getBatch('nonexistent', 'org_1');
    expect(result).toBeNull();
  });
});

// =============================================================================
// listBatches
// =============================================================================

describe('listBatches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns batches with pagination', async () => {
    const batches = [createMockBatchJob(), createMockBatchJob({ id: 'batch_2' })];

    let selectCount = 0;
    mockSelectChain.then = (resolve: (v: unknown) => unknown) => {
      selectCount++;
      if (selectCount === 1) return Promise.resolve(batches).then(resolve);
      return Promise.resolve([{ count: 5 }]).then(resolve);
    };

    const result = await listBatches('org_1', { limit: 2, offset: 0 });

    expect(result.batches).toHaveLength(2);
    expect(result.total).toBe(5);
    expect(result.hasMore).toBe(true);
  });

  it('hasMore is false when all items returned', async () => {
    const batches = [createMockBatchJob()];

    let selectCount = 0;
    mockSelectChain.then = (resolve: (v: unknown) => unknown) => {
      selectCount++;
      if (selectCount === 1) return Promise.resolve(batches).then(resolve);
      return Promise.resolve([{ count: 1 }]).then(resolve);
    };

    const result = await listBatches('org_1');
    expect(result.hasMore).toBe(false);
  });

  it('hasMore is false when offset+returned >= total', async () => {
    // offset=3, returned 2 items, total=5 → 3+2=5 >= 5 → hasMore=false
    const batches = [createMockBatchJob(), createMockBatchJob({ id: 'batch_2' })];

    let selectCount = 0;
    mockSelectChain.then = (resolve: (v: unknown) => unknown) => {
      selectCount++;
      if (selectCount === 1) return Promise.resolve(batches).then(resolve);
      return Promise.resolve([{ count: 5 }]).then(resolve);
    };

    const result = await listBatches('org_1', { limit: 2, offset: 3 });
    expect(result.batches).toHaveLength(2);
    expect(result.total).toBe(5);
    expect(result.hasMore).toBe(false);
  });
});

// =============================================================================
// getBatchResults
// =============================================================================

describe('getBatchResults', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when batch not found', async () => {
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);

    const result = await getBatchResults('nonexistent', 'org_1');
    expect(result).toBeNull();
  });

  it('returns items with pagination', async () => {
    const batch = createMockBatchJob({ processedItems: 5, successCount: 4, failureCount: 1 });
    const items = [createMockBatchItem({ status: 'completed', verdict: 'true', confidence: '0.9' })];

    let selectCount = 0;
    mockSelectChain.then = (resolve: (v: unknown) => unknown) => {
      selectCount++;
      if (selectCount === 1) return Promise.resolve([batch]).then(resolve);
      if (selectCount === 2) return Promise.resolve(items).then(resolve);
      return Promise.resolve([{ count: 10 }]).then(resolve);
    };

    const result = await getBatchResults('batch_1', 'org_1');
    expect(result).not.toBeNull();
    expect(result!.summary.processedItems).toBe(5);
    expect(result!.items).toHaveLength(1);
  });
});

// =============================================================================
// cancelBatch
// =============================================================================

describe('cancelBatch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns false when batch not found', async () => {
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);

    const result = await cancelBatch('nonexistent', 'org_1');
    expect(result).toBe(false);
  });

  it('returns false when batch already completed', async () => {
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([createMockBatchJob({ status: 'completed' })]).then(resolve);

    const result = await cancelBatch('batch_1', 'org_1');
    expect(result).toBe(false);
  });

  it('returns false when batch status is failed', async () => {
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([createMockBatchJob({ status: 'failed' })]).then(resolve);

    const result = await cancelBatch('batch_1', 'org_1');
    expect(result).toBe(false);
  });

  it('returns false when batch status is cancelled', async () => {
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([createMockBatchJob({ status: 'cancelled' })]).then(resolve);

    const result = await cancelBatch('batch_1', 'org_1');
    expect(result).toBe(false);
  });

  it('cancels pending batch', async () => {
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([createMockBatchJob({ status: 'pending' })]).then(resolve);

    const result = await cancelBatch('batch_1', 'org_1');
    expect(result).toBe(true);
    expect(mockCancelBatchItems).toHaveBeenCalledWith('batch_1');
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'batch.cancelled' })
    );
  });

  it('cancels processing batch', async () => {
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([createMockBatchJob({ status: 'processing' })]).then(resolve);

    const result = await cancelBatch('batch_1', 'org_1');
    expect(result).toBe(true);
  });

  it('cancels validating batch', async () => {
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([createMockBatchJob({ status: 'validating' })]).then(resolve);

    const result = await cancelBatch('batch_1', 'org_1');
    expect(result).toBe(true);
  });
});

// =============================================================================
// getBatchItem
// =============================================================================

describe('getBatchItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when batch not in org', async () => {
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([]).then(resolve);

    const result = await getBatchItem('item_1', 'batch_1', 'org_1');
    expect(result).toBeNull();
  });

  it('returns null when item not found', async () => {
    let selectCount = 0;
    mockSelectChain.then = (resolve: (v: unknown) => unknown) => {
      selectCount++;
      if (selectCount === 1) return Promise.resolve([{ id: 'batch_1' }]).then(resolve);
      return Promise.resolve([]).then(resolve);
    };

    const result = await getBatchItem('item_nonexistent', 'batch_1', 'org_1');
    expect(result).toBeNull();
  });

  it('returns formatted item', async () => {
    const item = createMockBatchItem({
      status: 'completed',
      verdict: 'true',
      confidence: '0.85',
      decision: 'accept',
    });

    let selectCount = 0;
    mockSelectChain.then = (resolve: (v: unknown) => unknown) => {
      selectCount++;
      if (selectCount === 1) return Promise.resolve([{ id: 'batch_1' }]).then(resolve);
      return Promise.resolve([item]).then(resolve);
    };

    const result = await getBatchItem('item_1', 'batch_1', 'org_1');
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(0.85); // String -> Number conversion
  });
});

// =============================================================================
// formatBatchResponse
// =============================================================================

describe('formatting', () => {
  it('calculates progress percentage', async () => {
    const batch = createMockBatchJob({ totalItems: 10, processedItems: 5 });
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([batch]).then(resolve);

    const result = await getBatch('batch_1', 'org_1');
    expect(result!.progress).toBe(50);
  });

  it('handles zero items', async () => {
    const batch = createMockBatchJob({ totalItems: 0, processedItems: 0 });
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([batch]).then(resolve);

    const result = await getBatch('batch_1', 'org_1');
    expect(result!.progress).toBe(0);
  });

  it('converts dates to ISO strings', async () => {
    const batch = createMockBatchJob({
      createdAt: new Date('2025-06-15T10:00:00Z'),
      startedAt: new Date('2025-06-15T10:01:00Z'),
      completedAt: null,
    });
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([batch]).then(resolve);

    const result = await getBatch('batch_1', 'org_1');
    expect(result!.createdAt).toBe('2025-06-15T10:00:00.000Z');
    expect(result!.startedAt).toBe('2025-06-15T10:01:00.000Z');
    expect(result!.completedAt).toBeNull();
  });

  it('calculates partial progress (7/10 = 70%)', async () => {
    const batch = createMockBatchJob({ totalItems: 10, processedItems: 7 });
    mockSelectChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve([batch]).then(resolve);

    const result = await getBatch('batch_1', 'org_1');
    expect(result!.progress).toBe(70);
  });

  it('converts string confidence "0.92" to Number 0.92 in item response', async () => {
    const item = createMockBatchItem({
      status: 'completed',
      verdict: 'true',
      confidence: '0.92',
      decision: 'accept',
    });

    let selectCount = 0;
    mockSelectChain.then = (resolve: (v: unknown) => unknown) => {
      selectCount++;
      if (selectCount === 1) return Promise.resolve([{ id: 'batch_1' }]).then(resolve);
      return Promise.resolve([item]).then(resolve);
    };

    const result = await getBatchItem('item_1', 'batch_1', 'org_1');
    expect(result!.confidence).toBe(0.92);
    expect(typeof result!.confidence).toBe('number');
  });

  it('converts completedAt Date to ISO string, null to null', async () => {
    const completedDate = new Date('2025-06-15T12:00:00Z');
    const itemCompleted = createMockBatchItem({
      status: 'completed',
      completedAt: completedDate,
    });
    const itemPending = createMockBatchItem({
      id: 'item_2',
      status: 'pending',
      completedAt: null,
    });

    let selectCount = 0;
    mockSelectChain.then = (resolve: (v: unknown) => unknown) => {
      selectCount++;
      if (selectCount === 1) return Promise.resolve([{ id: 'batch_1' }]).then(resolve);
      if (selectCount === 2) return Promise.resolve([itemCompleted]).then(resolve);
      if (selectCount === 3) return Promise.resolve([{ id: 'batch_1' }]).then(resolve);
      return Promise.resolve([itemPending]).then(resolve);
    };

    const result1 = await getBatchItem('item_1', 'batch_1', 'org_1');
    expect(result1!.completedAt).toBe('2025-06-15T12:00:00.000Z');

    const result2 = await getBatchItem('item_2', 'batch_1', 'org_1');
    expect(result2!.completedAt).toBeNull();
  });

  it('handles null confidence in item', async () => {
    const item = createMockBatchItem({ confidence: null });

    let selectCount = 0;
    mockSelectChain.then = (resolve: (v: unknown) => unknown) => {
      selectCount++;
      if (selectCount === 1) return Promise.resolve([{ id: 'batch_1' }]).then(resolve);
      return Promise.resolve([item]).then(resolve);
    };

    const result = await getBatchItem('item_1', 'batch_1', 'org_1');
    expect(result!.confidence).toBeNull();
  });
});
