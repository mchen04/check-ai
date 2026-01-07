/**
 * Batch Cleanup Service
 * Handles expiration of old batch jobs and their associated data
 */

import { db } from '@/utils/db/db';
import { batchJobsTable, batchItemsTable } from '@/utils/db/schema';
import { lt, and, inArray } from 'drizzle-orm';

// =============================================================================
// Types
// =============================================================================

export interface CleanupResult {
  batchesDeleted: number;
  itemsDeleted: number;
  errors: string[];
  durationMs: number;
}

export interface CleanupOptions {
  /** Maximum batches to process per run (default: 1000) */
  limit?: number;
  /** Only process batches with these statuses (default: completed, failed, cancelled) */
  statuses?: Array<'completed' | 'failed' | 'cancelled'>;
  /** Dry run - don't actually delete, just report what would be deleted */
  dryRun?: boolean;
}

// =============================================================================
// Cleanup Functions
// =============================================================================

/**
 * Delete expired batch jobs and their items
 *
 * Uses the expiresAt field which should be set to createdAt + RESULTS_EXPIRY_DAYS (30 days)
 * Only deletes batches that are in a terminal state (completed, failed, cancelled)
 */
export async function cleanupExpiredBatches(
  options: CleanupOptions = {}
): Promise<CleanupResult> {
  const startTime = Date.now();
  const {
    limit = 1000,
    statuses = ['completed', 'failed', 'cancelled'],
    dryRun = false,
  } = options;

  const result: CleanupResult = {
    batchesDeleted: 0,
    itemsDeleted: 0,
    errors: [],
    durationMs: 0,
  };

  const now = new Date();

  try {
    // Find expired batches
    const expiredBatches = await db
      .select({ id: batchJobsTable.id })
      .from(batchJobsTable)
      .where(
        and(
          lt(batchJobsTable.expiresAt, now),
          inArray(batchJobsTable.status, statuses)
        )
      )
      .limit(limit);

    if (expiredBatches.length === 0) {
      result.durationMs = Date.now() - startTime;
      return result;
    }

    const batchIds = expiredBatches.map((b) => b.id);

    console.log(
      `[Cleanup] Found ${batchIds.length} expired batches to delete${dryRun ? ' (dry run)' : ''}`
    );

    if (dryRun) {
      result.batchesDeleted = batchIds.length;
      result.durationMs = Date.now() - startTime;
      return result;
    }

    // Delete items first (foreign key constraint)
    const itemsResult = await db
      .delete(batchItemsTable)
      .where(inArray(batchItemsTable.batchId, batchIds));

    result.itemsDeleted = itemsResult.rowCount ?? 0;

    // Delete batch jobs
    const batchesResult = await db
      .delete(batchJobsTable)
      .where(inArray(batchJobsTable.id, batchIds));

    result.batchesDeleted = batchesResult.rowCount ?? batchIds.length;

    console.log(
      `[Cleanup] Deleted ${result.batchesDeleted} batches and ${result.itemsDeleted} items`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(errorMessage);
    console.error('[Cleanup] Error during batch cleanup:', error);
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

/**
 * Get statistics about expired and expiring batches
 */
export async function getCleanupStats(): Promise<{
  expiredCount: number;
  expiringIn24Hours: number;
  expiringIn7Days: number;
}> {
  const now = new Date();
  const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [expired, expiring24h, expiring7d] = await Promise.all([
    db
      .select({ id: batchJobsTable.id })
      .from(batchJobsTable)
      .where(
        and(
          lt(batchJobsTable.expiresAt, now),
          inArray(batchJobsTable.status, ['completed', 'failed', 'cancelled'])
        )
      ),
    db
      .select({ id: batchJobsTable.id })
      .from(batchJobsTable)
      .where(
        and(
          lt(batchJobsTable.expiresAt, in24Hours),
          inArray(batchJobsTable.status, ['completed', 'failed', 'cancelled'])
        )
      ),
    db
      .select({ id: batchJobsTable.id })
      .from(batchJobsTable)
      .where(
        and(
          lt(batchJobsTable.expiresAt, in7Days),
          inArray(batchJobsTable.status, ['completed', 'failed', 'cancelled'])
        )
      ),
  ]);

  return {
    expiredCount: expired.length,
    expiringIn24Hours: expiring24h.length,
    expiringIn7Days: expiring7d.length,
  };
}
