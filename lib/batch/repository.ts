/**
 * Batch Repository
 * Database operations for batch job management
 */

import { db } from '@/utils/db/db';
import { batchJobsTable, batchItemsTable } from '@/utils/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { MethodsConfig } from '@/lib/verification/types';
import type { BatchStatus, BatchItemStatus } from '@/utils/db/schema';
import type { BatchValidationError } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface BatchJobRecord {
  id: string;
  orgId: string;
  name: string | null;
  inputFormat: 'json' | 'csv';
  originalFileName: string | null;
  methodsConfig: MethodsConfig;
  context: Record<string, unknown> | null;
  status: BatchStatus;
  totalItems: number;
  processedItems: number;
  successCount: number;
  failureCount: number;
  triggerTaskIds: string[] | null; // Trigger.dev task IDs
  errorMessage: string | null;
  validationErrors: BatchValidationError[] | null;
  totalCostCents: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  expiresAt: Date | null;
}

export interface BatchItemRecord {
  id: string;
  batchId: string;
  itemIndex: number;
  idempotencyKey: string | null;
  content: string;
  itemContext: Record<string, unknown> | null;
  status: BatchItemStatus;
  verificationId: string | null;
  verdict: string | null;
  confidence: number | null;
  decision: string | null;
  errorMessage: string | null;
  retryCount: number;
  costCents: number | null;
  processingTimeMs: number | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface CreateBatchJobInput {
  orgId: string;
  name?: string | null;
  inputFormat: 'json' | 'csv';
  originalFileName?: string | null;
  methodsConfig: MethodsConfig;
  context?: Record<string, unknown> | null;
  totalItems: number;
  expiresAt?: Date | null;
}

export interface CreateBatchItemInput {
  batchId: string;
  itemIndex: number;
  content: string;
  itemContext?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
}

export interface UpdateBatchJobInput {
  status?: BatchStatus;
  processedItems?: number;
  successCount?: number;
  failureCount?: number;
  triggerTaskIds?: string[]; // Trigger.dev task IDs
  errorMessage?: string | null;
  validationErrors?: BatchValidationError[];
  totalCostCents?: number;
  totalInputTokens?: number;
  totalOutputTokens?: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface UpdateBatchItemInput {
  status?: BatchItemStatus;
  verificationId?: string;
  verdict?: string;
  confidence?: string; // Decimal stored as string in DB
  decision?: string;
  errorMessage?: string | null;
  retryCount?: number;
  costCents?: number;
  processingTimeMs?: number;
  startedAt?: Date;
  completedAt?: Date;
}

// =============================================================================
// REPOSITORY FUNCTIONS
// =============================================================================

/**
 * Create a new batch job
 */
export async function createBatchJob(
  input: CreateBatchJobInput
): Promise<BatchJobRecord> {
  const [job] = await db
    .insert(batchJobsTable)
    .values({
      orgId: input.orgId,
      name: input.name || null,
      inputFormat: input.inputFormat,
      originalFileName: input.originalFileName || null,
      methodsConfig: input.methodsConfig,
      context: input.context || null,
      totalItems: input.totalItems,
      expiresAt: input.expiresAt || null,
    })
    .returning();

  return job as BatchJobRecord;
}

/**
 * Get batch job by ID
 */
export async function getBatchJob(id: string): Promise<BatchJobRecord | null> {
  const [job] = await db
    .select()
    .from(batchJobsTable)
    .where(eq(batchJobsTable.id, id))
    .limit(1);

  return job as BatchJobRecord | null;
}

/**
 * Get batch job by ID and org
 */
export async function getBatchJobByIdAndOrg(
  id: string,
  orgId: string
): Promise<BatchJobRecord | null> {
  const [job] = await db
    .select()
    .from(batchJobsTable)
    .where(and(eq(batchJobsTable.id, id), eq(batchJobsTable.orgId, orgId)))
    .limit(1);

  return job as BatchJobRecord | null;
}

/**
 * List batch jobs for an organization
 */
export async function listBatchJobs(
  orgId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ jobs: BatchJobRecord[]; hasMore: boolean }> {
  const jobs = await db
    .select()
    .from(batchJobsTable)
    .where(eq(batchJobsTable.orgId, orgId))
    .orderBy(desc(batchJobsTable.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = jobs.length > limit;
  const results = hasMore ? jobs.slice(0, limit) : jobs;

  return { jobs: results as BatchJobRecord[], hasMore };
}

/**
 * Update batch job
 */
export async function updateBatchJob(
  id: string,
  updates: UpdateBatchJobInput
): Promise<BatchJobRecord | null> {
  const [job] = await db
    .update(batchJobsTable)
    .set(updates)
    .where(eq(batchJobsTable.id, id))
    .returning();

  return job as BatchJobRecord | null;
}

/**
 * Update batch job status
 */
export async function updateBatchStatus(
  id: string,
  status: BatchStatus,
  errorMessage?: string | null
): Promise<void> {
  const updates: Partial<UpdateBatchJobInput> = { status };

  if (status === 'processing' && !errorMessage) {
    updates.startedAt = new Date();
  } else if (['completed', 'failed', 'cancelled'].includes(status)) {
    updates.completedAt = new Date();
  }

  if (errorMessage !== undefined) {
    updates.errorMessage = errorMessage;
  }

  await db.update(batchJobsTable).set(updates).where(eq(batchJobsTable.id, id));
}

/**
 * Increment batch job counters atomically
 */
export async function incrementBatchCounters(
  id: string,
  success: boolean,
  costCents: number = 0
): Promise<void> {
  const updates: Record<string, unknown> = {
    processedItems: sql`${batchJobsTable.processedItems} + 1`,
    totalCostCents: sql`${batchJobsTable.totalCostCents} + ${costCents}`,
  };

  if (success) {
    updates.successCount = sql`${batchJobsTable.successCount} + 1`;
  } else {
    updates.failureCount = sql`${batchJobsTable.failureCount} + 1`;
  }

  await db
    .update(batchJobsTable)
    .set(updates)
    .where(eq(batchJobsTable.id, id));
}

/**
 * Create batch items
 */
export async function createBatchItems(
  items: CreateBatchItemInput[]
): Promise<BatchItemRecord[]> {
  if (items.length === 0) return [];

  const inserted = await db
    .insert(batchItemsTable)
    .values(
      items.map((item) => ({
        batchId: item.batchId,
        itemIndex: item.itemIndex,
        content: item.content,
        itemContext: item.itemContext || null,
        idempotencyKey: item.idempotencyKey || null,
      }))
    )
    .returning();

  return inserted as BatchItemRecord[];
}

/**
 * Get batch item by ID
 */
export async function getBatchItem(id: string): Promise<BatchItemRecord | null> {
  const [item] = await db
    .select()
    .from(batchItemsTable)
    .where(eq(batchItemsTable.id, id))
    .limit(1);

  return item as BatchItemRecord | null;
}

/**
 * Get batch items for a batch job
 */
export async function getBatchItems(
  batchId: string,
  limit: number = 100,
  offset: number = 0
): Promise<BatchItemRecord[]> {
  const items = await db
    .select()
    .from(batchItemsTable)
    .where(eq(batchItemsTable.batchId, batchId))
    .orderBy(batchItemsTable.itemIndex)
    .limit(limit)
    .offset(offset);

  return items as BatchItemRecord[];
}

/**
 * Update batch item
 */
export async function updateBatchItem(
  id: string,
  updates: UpdateBatchItemInput
): Promise<BatchItemRecord | null> {
  const [item] = await db
    .update(batchItemsTable)
    .set(updates)
    .where(eq(batchItemsTable.id, id))
    .returning();

  return item as BatchItemRecord | null;
}

/**
 * Count batch items by status
 */
export async function countBatchItemsByStatus(
  batchId: string
): Promise<Record<BatchItemStatus, number>> {
  const results = await db
    .select({
      status: batchItemsTable.status,
      count: sql<number>`count(*)`,
    })
    .from(batchItemsTable)
    .where(eq(batchItemsTable.batchId, batchId))
    .groupBy(batchItemsTable.status);

  const counts: Record<string, number> = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };

  for (const row of results) {
    counts[row.status] = Number(row.count);
  }

  return counts as Record<BatchItemStatus, number>;
}
