/**
 * Batch Progress Tracking
 * Track and update batch job progress
 */

import { eq, sql, and } from 'drizzle-orm';
import { db } from '@/utils/db/db';
import { batchJobsTable, batchItemsTable } from '@/utils/db/schema';
import { fireWebhooks } from '@/lib/webhooks';
import type { BatchStatus } from '@/utils/db/schema';
import { createLogger } from '@/lib/logger';
import type { BatchRealtimeEvent, BatchItemProcessResult } from './types';

const log = createLogger('Batch');

// =============================================================================
// Progress Updates
// =============================================================================

/**
 * Update a batch item with processing results
 */
export async function updateBatchItemResult(
  itemId: string,
  result: BatchItemProcessResult
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status: result.success ? 'completed' : 'failed',
    completedAt: new Date(),
  };

  if (result.verificationId) {
    updateData.verificationId = result.verificationId;
  }
  if (result.verdict) {
    updateData.verdict = result.verdict;
  }
  if (result.confidence !== undefined) {
    updateData.confidence = String(result.confidence);
  }
  if (result.decision) {
    updateData.decision = result.decision;
  }
  if (result.costCents !== undefined) {
    updateData.costCents = result.costCents;
  }
  if (result.processingTimeMs !== undefined) {
    updateData.processingTimeMs = result.processingTimeMs;
  }
  if (result.error) {
    updateData.errorMessage = result.error;
  }

  await db.update(batchItemsTable).set(updateData).where(eq(batchItemsTable.id, itemId));
}

/**
 * Update batch job progress counters
 */
export async function updateBatchProgress(
  batchId: string,
  success: boolean,
  costCents: number = 0,
  inputTokens: number = 0,
  outputTokens: number = 0
): Promise<{
  isComplete: boolean;
  processedItems: number;
  successCount: number;
  failureCount: number;
  totalItems: number;
}> {
  // Use atomic increment to avoid race conditions
  const updateQuery = success
    ? {
        processedItems: sql`${batchJobsTable.processedItems} + 1`,
        successCount: sql`${batchJobsTable.successCount} + 1`,
        totalCostCents: sql`${batchJobsTable.totalCostCents} + ${costCents}`,
        totalInputTokens: sql`${batchJobsTable.totalInputTokens} + ${inputTokens}`,
        totalOutputTokens: sql`${batchJobsTable.totalOutputTokens} + ${outputTokens}`,
      }
    : {
        processedItems: sql`${batchJobsTable.processedItems} + 1`,
        failureCount: sql`${batchJobsTable.failureCount} + 1`,
      };

  await db.update(batchJobsTable).set(updateQuery).where(eq(batchJobsTable.id, batchId));

  // Get updated batch to check completion
  const [batch] = await db
    .select({
      totalItems: batchJobsTable.totalItems,
      processedItems: batchJobsTable.processedItems,
      successCount: batchJobsTable.successCount,
      failureCount: batchJobsTable.failureCount,
    })
    .from(batchJobsTable)
    .where(eq(batchJobsTable.id, batchId))
    .limit(1);

  if (!batch) {
    throw new Error(`Batch ${batchId} not found`);
  }

  const isComplete = batch.processedItems >= batch.totalItems;

  return {
    isComplete,
    processedItems: batch.processedItems,
    successCount: batch.successCount,
    failureCount: batch.failureCount,
    totalItems: batch.totalItems,
  };
}

/**
 * Mark a batch as completed
 * Uses WHERE condition to prevent race condition when multiple items complete simultaneously
 * Uses RETURNING to get accurate final counts for the webhook
 */
export async function completeBatch(
  batchId: string,
  orgId: string
): Promise<void> {
  // First, get the current batch to determine the final status
  const [batch] = await db
    .select({
      totalItems: batchJobsTable.totalItems,
      failureCount: batchJobsTable.failureCount,
    })
    .from(batchJobsTable)
    .where(eq(batchJobsTable.id, batchId))
    .limit(1);

  if (!batch) {
    throw new Error(`Batch ${batchId} not found`);
  }

  // Determine final status based on results
  const finalStatus =
    batch.failureCount === batch.totalItems
      ? 'failed'
      : 'completed';

  // Use WHERE condition to only update if still processing
  // This prevents race condition when multiple items complete simultaneously
  // Use RETURNING to get the accurate final values for the webhook
  const completedAt = new Date();
  const result = await db
    .update(batchJobsTable)
    .set({
      status: finalStatus,
      completedAt,
    })
    .where(and(
      eq(batchJobsTable.id, batchId),
      eq(batchJobsTable.status, 'processing')
    ))
    .returning({
      id: batchJobsTable.id,
      totalItems: batchJobsTable.totalItems,
      successCount: batchJobsTable.successCount,
      failureCount: batchJobsTable.failureCount,
      totalCostCents: batchJobsTable.totalCostCents,
    });

  // If no rows updated, batch was already completed by another item
  if (result.length === 0) {
    log.debug({ batchId }, 'Batch already completed, skipping');
    return;
  }

  const updatedBatch = result[0];

  // Fire webhook for batch completion with accurate values from RETURNING
  const webhookEvent = finalStatus === 'failed' ? 'batch.failed' : 'batch.completed';

  await fireWebhooks(orgId, webhookEvent, {
    batchId,
    status: finalStatus,
    totalItems: updatedBatch.totalItems,
    successCount: updatedBatch.successCount,
    failureCount: updatedBatch.failureCount,
    totalCostCents: updatedBatch.totalCostCents,
    completedAt: completedAt.toISOString(),
  });
}

/**
 * Mark a batch as failed
 */
export async function failBatch(
  batchId: string,
  orgId: string,
  errorMessage: string
): Promise<void> {
  await db
    .update(batchJobsTable)
    .set({
      status: 'failed',
      errorMessage,
      completedAt: new Date(),
    })
    .where(eq(batchJobsTable.id, batchId));

  // Fire webhook
  await fireWebhooks(orgId, 'batch.failed', {
    batchId,
    status: 'failed',
    errorMessage,
    failedAt: new Date().toISOString(),
  });
}

// =============================================================================
// Batch Status Helpers
// =============================================================================

/**
 * Get batch progress summary
 */
export async function getBatchProgress(batchId: string): Promise<{
  status: string;
  totalItems: number;
  processedItems: number;
  successCount: number;
  failureCount: number;
  progress: number;
  totalCostCents: number;
} | null> {
  const [batch] = await db
    .select({
      status: batchJobsTable.status,
      totalItems: batchJobsTable.totalItems,
      processedItems: batchJobsTable.processedItems,
      successCount: batchJobsTable.successCount,
      failureCount: batchJobsTable.failureCount,
      totalCostCents: batchJobsTable.totalCostCents,
    })
    .from(batchJobsTable)
    .where(eq(batchJobsTable.id, batchId))
    .limit(1);

  if (!batch) {
    return null;
  }

  return {
    ...batch,
    progress: batch.totalItems > 0 ? (batch.processedItems / batch.totalItems) * 100 : 0,
  };
}

/**
 * Check if batch is still active (can be processed)
 */
export async function isBatchActive(batchId: string): Promise<boolean> {
  const [batch] = await db
    .select({ status: batchJobsTable.status })
    .from(batchJobsTable)
    .where(eq(batchJobsTable.id, batchId))
    .limit(1);

  if (!batch) {
    return false;
  }

  return ['pending', 'validating', 'processing'].includes(batch.status);
}

/**
 * Mark item as processing (started)
 */
export async function markItemProcessing(itemId: string): Promise<void> {
  await db
    .update(batchItemsTable)
    .set({
      status: 'processing',
      startedAt: new Date(),
    })
    .where(eq(batchItemsTable.id, itemId));
}

// =============================================================================
// Realtime Broadcasting
// =============================================================================

/**
 * Create a Supabase Realtime channel name for a batch
 */
export function getBatchChannelName(batchId: string): string {
  return `batch:${batchId}`;
}

/**
 * Build a batch status update event
 */
export function buildStatusUpdateEvent(
  status: BatchStatus,
  errorMessage?: string
): BatchRealtimeEvent {
  return {
    type: 'status_update',
    status,
    errorMessage,
  };
}

/**
 * Build a batch item complete event
 */
export function buildItemCompleteEvent(
  itemId: string,
  itemIndex: number,
  success: boolean,
  processedItems: number,
  successCount: number,
  failureCount: number,
  verdict?: string,
  confidence?: number
): BatchRealtimeEvent {
  return {
    type: 'item_complete',
    itemId,
    itemIndex,
    success,
    verdict,
    confidence,
    processedItems,
    successCount,
    failureCount,
  };
}

/**
 * Build a batch complete event
 */
export function buildCompleteEvent(
  status: BatchStatus,
  totalItems: number,
  successCount: number,
  failureCount: number,
  totalCostCents: number
): BatchRealtimeEvent {
  return {
    type: 'complete',
    status,
    totalItems,
    successCount,
    failureCount,
    totalCostCents,
  };
}
