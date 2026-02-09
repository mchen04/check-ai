/**
 * Trigger.dev Integration for Batch Processing
 * Replaces QStash for batch item processing with automatic retries
 */

import { tasks } from "@trigger.dev/sdk/v3";
import { eq, inArray, and } from "drizzle-orm";
import type { batchItemProcessingTask } from "@/trigger/batch-processing";
import { db } from "@/utils/db/db";
import { batchJobsTable, batchItemsTable } from "@/utils/db/schema";
import { createLogger } from "@/lib/logger";
import type { VerifyOptions } from "@/lib/verification/types";
import type { MethodOverrides } from "@/lib/verification/validator";
import type { MethodsConfig } from "./types";

const log = createLogger("Batch Trigger");

// =============================================================================
// Configuration
// =============================================================================

export const BATCH_TRIGGER_CONFIG = {
  MAX_RETRIES: 3,
  TIMEOUT_MS: 120000, // 2 minutes per item
  CONCURRENCY: 10, // Max concurrent items to queue at once
} as const;

// =============================================================================
// Types
// =============================================================================

export interface BatchItemPayload {
  batchId: string;
  itemId: string;
  itemIndex: number;
  orgId: string;
  content: string;
  context: Record<string, unknown> | null;
  methodsConfig: MethodsConfig;
  methodOverrides?: MethodOverrides;
  options?: VerifyOptions;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if Trigger.dev is configured
 */
export function isTriggerConfigured(): boolean {
  return !!process.env.TRIGGER_SECRET_KEY;
}

/**
 * Queue batch items for processing via Trigger.dev
 */
export async function queueBatchItems(
  batchId: string,
  items: Array<{
    id: string;
    itemIndex: number;
    content: string;
    itemContext: Record<string, unknown> | null;
  }>,
  orgId: string,
  methodsConfig: MethodsConfig,
  options?: VerifyOptions,
  methodOverrides?: MethodOverrides
): Promise<{ queued: number; taskIds: string[] }> {
  if (!isTriggerConfigured()) {
    throw new Error("Trigger.dev not configured for batch processing");
  }

  const taskIds: string[] = [];

  // Queue items in batches to avoid overwhelming the system
  const batchSize = BATCH_TRIGGER_CONFIG.CONCURRENCY;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const queuePromises = batch.map(async (item) => {
      const payload: BatchItemPayload = {
        batchId,
        itemId: item.id,
        itemIndex: item.itemIndex,
        orgId,
        content: item.content,
        context: item.itemContext,
        methodsConfig,
        methodOverrides,
        options,
      };

      try {
        const handle = await tasks.trigger<typeof batchItemProcessingTask>(
          "batch-item-processing",
          payload
        );

        return handle.id;
      } catch (error) {
        log.error({ err: error, itemId: item.id, batchId }, "Failed to queue item");
        throw error;
      }
    });

    const batchTaskIds = await Promise.all(queuePromises);
    taskIds.push(...batchTaskIds);
  }

  // Update items to queued status
  await db
    .update(batchItemsTable)
    .set({ status: "queued" })
    .where(
      inArray(
        batchItemsTable.id,
        items.map((i) => i.id)
      )
    );

  // Store task IDs on batch job and update status
  await db
    .update(batchJobsTable)
    .set({
      triggerTaskIds: taskIds,
      status: "processing",
      startedAt: new Date(),
    })
    .where(eq(batchJobsTable.id, batchId));

  log.info({ batchId, queued: items.length }, "Batch items queued with Trigger.dev");

  return { queued: items.length, taskIds };
}

/**
 * Cancel all pending items in a batch
 * Note: Trigger.dev tasks cannot be cancelled after they start,
 * but we can mark items as skipped in our database
 */
export async function cancelBatchItems(batchId: string): Promise<void> {
  // Get the batch
  const [batch] = await db
    .select()
    .from(batchJobsTable)
    .where(eq(batchJobsTable.id, batchId))
    .limit(1);

  if (!batch) {
    throw new Error("Batch not found");
  }

  // Note: Trigger.dev tasks run to completion once started
  // We mark pending/queued items as skipped - the tasks will check isBatchActive()
  // and skip processing if the batch is cancelled

  // Update pending/queued items to skipped (only for this batch)
  await db
    .update(batchItemsTable)
    .set({
      status: "skipped",
      completedAt: new Date(),
    })
    .where(
      and(
        eq(batchItemsTable.batchId, batchId),
        inArray(batchItemsTable.status, ["pending", "queued"])
      )
    );

  // Update batch status
  await db
    .update(batchJobsTable)
    .set({
      status: "cancelled",
      completedAt: new Date(),
    })
    .where(eq(batchJobsTable.id, batchId));

  log.info({ batchId }, "Batch cancelled");
}
