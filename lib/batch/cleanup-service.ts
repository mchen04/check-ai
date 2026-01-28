/**
 * Data Cleanup Service
 * Handles expiration of old batch jobs, verifications, and their associated data
 */

import { lt, and, inArray } from 'drizzle-orm';
import { db } from '@/utils/db/db';
import { batchJobsTable, batchItemsTable, verificationsTable, paradigmResultsTable } from '@/utils/db/schema';
import { createLogger } from '@/lib/logger';

const log = createLogger('Cleanup');

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

    log.info(
      { count: batchIds.length, dryRun },
      `Found ${batchIds.length} expired batches to delete${dryRun ? ' (dry run)' : ''}`
    );

    if (dryRun) {
      result.batchesDeleted = batchIds.length;
      result.durationMs = Date.now() - startTime;
      return result;
    }

    // Count items to be deleted
    const itemsToDelete = await db
      .select({ id: batchItemsTable.id })
      .from(batchItemsTable)
      .where(inArray(batchItemsTable.batchId, batchIds));

    result.itemsDeleted = itemsToDelete.length;

    // Delete items first (foreign key constraint)
    await db
      .delete(batchItemsTable)
      .where(inArray(batchItemsTable.batchId, batchIds));

    // Delete batch jobs
    await db
      .delete(batchJobsTable)
      .where(inArray(batchJobsTable.id, batchIds));

    result.batchesDeleted = batchIds.length;

    log.info(
      { batchesDeleted: result.batchesDeleted, itemsDeleted: result.itemsDeleted },
      `Deleted ${result.batchesDeleted} batches and ${result.itemsDeleted} items`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(errorMessage);
    log.error({ err: error }, 'Error during batch cleanup');
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

// =============================================================================
// Verification Cleanup
// =============================================================================

export interface VerificationCleanupResult {
  verificationsDeleted: number;
  paradigmResultsDeleted: number;
  errors: string[];
  durationMs: number;
}

export interface VerificationCleanupOptions {
  /** Maximum verifications to process per run (default: 1000) */
  limit?: number;
  /** Dry run - don't actually delete, just report what would be deleted */
  dryRun?: boolean;
}

/**
 * Delete expired verifications and their paradigm results
 *
 * Uses the expiresAt field which is set based on organization's verificationRetentionDays
 */
export async function cleanupExpiredVerifications(
  options: VerificationCleanupOptions = {}
): Promise<VerificationCleanupResult> {
  const startTime = Date.now();
  const { limit = 1000, dryRun = false } = options;

  const result: VerificationCleanupResult = {
    verificationsDeleted: 0,
    paradigmResultsDeleted: 0,
    errors: [],
    durationMs: 0,
  };

  const now = new Date();

  try {
    // Find expired verifications
    const expiredVerifications = await db
      .select({ id: verificationsTable.id })
      .from(verificationsTable)
      .where(lt(verificationsTable.expiresAt, now))
      .limit(limit);

    if (expiredVerifications.length === 0) {
      result.durationMs = Date.now() - startTime;
      return result;
    }

    const verificationIds = expiredVerifications.map((v) => v.id);

    log.info(
      { count: verificationIds.length, dryRun },
      `Found ${verificationIds.length} expired verifications to delete${dryRun ? ' (dry run)' : ''}`
    );

    if (dryRun) {
      result.verificationsDeleted = verificationIds.length;
      result.durationMs = Date.now() - startTime;
      return result;
    }

    // Count paradigm results to be deleted
    const paradigmResultsToDelete = await db
      .select({ id: paradigmResultsTable.id })
      .from(paradigmResultsTable)
      .where(inArray(paradigmResultsTable.verificationId, verificationIds));

    result.paradigmResultsDeleted = paradigmResultsToDelete.length;

    // Delete paradigm results first (foreign key constraint)
    await db
      .delete(paradigmResultsTable)
      .where(inArray(paradigmResultsTable.verificationId, verificationIds));

    // Delete verifications
    await db
      .delete(verificationsTable)
      .where(inArray(verificationsTable.id, verificationIds));

    result.verificationsDeleted = verificationIds.length;

    log.info(
      { verificationsDeleted: result.verificationsDeleted, paradigmResultsDeleted: result.paradigmResultsDeleted },
      `Deleted ${result.verificationsDeleted} verifications and ${result.paradigmResultsDeleted} paradigm results`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(errorMessage);
    log.error({ err: error }, 'Error during verification cleanup');
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

/**
 * Get combined cleanup statistics for batches and verifications
 */
export async function getFullCleanupStats(): Promise<{
  batches: {
    expiredCount: number;
    expiringIn24Hours: number;
    expiringIn7Days: number;
  };
  verifications: {
    expiredCount: number;
    expiringIn24Hours: number;
    expiringIn7Days: number;
  };
}> {
  const now = new Date();
  const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [batchStats, verificationExpired, verificationExpiring24h, verificationExpiring7d] =
    await Promise.all([
      getCleanupStats(),
      db
        .select({ id: verificationsTable.id })
        .from(verificationsTable)
        .where(lt(verificationsTable.expiresAt, now)),
      db
        .select({ id: verificationsTable.id })
        .from(verificationsTable)
        .where(lt(verificationsTable.expiresAt, in24Hours)),
      db
        .select({ id: verificationsTable.id })
        .from(verificationsTable)
        .where(lt(verificationsTable.expiresAt, in7Days)),
    ]);

  return {
    batches: batchStats,
    verifications: {
      expiredCount: verificationExpired.length,
      expiringIn24Hours: verificationExpiring24h.length,
      expiringIn7Days: verificationExpiring7d.length,
    },
  };
}
