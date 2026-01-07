/**
 * Batch QStash Integration
 * Queue management for batch item processing
 */

import { Client } from '@upstash/qstash';
import { db } from '@/utils/db/db';
import { batchJobsTable, batchItemsTable } from '@/utils/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import type { BatchItemQueuePayload, MethodsConfig } from './types';
import { createLogger } from '@/lib/logger';

const log = createLogger('Batch QStash');

// =============================================================================
// QStash Client
// =============================================================================

let qstashClient: Client | null = null;

/**
 * Get QStash client instance (singleton)
 */
export function getBatchQStashClient(): Client | null {
  if (qstashClient) return qstashClient;

  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    log.warn('Not configured');
    return null;
  }

  qstashClient = new Client({ token });
  return qstashClient;
}

// =============================================================================
// Configuration
// =============================================================================

export const BATCH_QSTASH_CONFIG = {
  MAX_RETRIES: 3,
  TIMEOUT_SECONDS: 120, // 2 minutes per item
  CONCURRENCY: 10, // Max concurrent items
  MAX_PAYLOAD_SIZE: 1024 * 1024, // 1MB QStash limit
} as const;

/**
 * Get the batch processing handler URL
 */
export function getBatchProcessorUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3001';
  return `${baseUrl}/api/batch/process`;
}

// =============================================================================
// Queue Operations
// =============================================================================

/**
 * Queue batch items for processing
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
  methodsConfig: MethodsConfig
): Promise<{ queued: number; messageIds: string[] }> {
  const client = getBatchQStashClient();

  if (!client) {
    throw new Error('QStash not configured for batch processing');
  }

  const processorUrl = getBatchProcessorUrl();
  const messageIds: string[] = [];

  // Queue items in parallel with concurrency limit
  const batchSize = BATCH_QSTASH_CONFIG.CONCURRENCY;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const queuePromises = batch.map(async (item) => {
      const payload: BatchItemQueuePayload = {
        batchId,
        itemId: item.id,
        itemIndex: item.itemIndex,
        orgId,
        content: item.content,
        context: item.itemContext,
        methodsConfig,
        attempt: 1,
      };

      // Validate payload size before sending to QStash
      const payloadSize = JSON.stringify(payload).length;
      if (payloadSize > BATCH_QSTASH_CONFIG.MAX_PAYLOAD_SIZE) {
        throw new Error(
          `Payload size (${Math.round(payloadSize / 1024)}KB) exceeds QStash limit (${Math.round(BATCH_QSTASH_CONFIG.MAX_PAYLOAD_SIZE / 1024)}KB) for item ${item.id}`
        );
      }

      try {
        const response = await client.publishJSON({
          url: processorUrl,
          body: payload,
          retries: BATCH_QSTASH_CONFIG.MAX_RETRIES,
          timeout: BATCH_QSTASH_CONFIG.TIMEOUT_SECONDS,
        });

        return response.messageId;
      } catch (error) {
        log.error({ err: error, itemId: item.id, batchId }, 'Failed to queue item');
        throw error;
      }
    });

    const batchMessageIds = await Promise.all(queuePromises);
    messageIds.push(...batchMessageIds);
  }

  // Update items to queued status
  await db
    .update(batchItemsTable)
    .set({ status: 'queued' })
    .where(
      inArray(
        batchItemsTable.id,
        items.map((i) => i.id)
      )
    );

  // Store message IDs on batch job
  await db
    .update(batchJobsTable)
    .set({
      qstashMessageIds: messageIds,
      status: 'processing',
      startedAt: new Date(),
    })
    .where(eq(batchJobsTable.id, batchId));

  return { queued: items.length, messageIds };
}

/**
 * Cancel all pending items in a batch
 */
export async function cancelBatchItems(batchId: string): Promise<void> {
  const client = getBatchQStashClient();

  // Get the batch with message IDs
  const [batch] = await db
    .select()
    .from(batchJobsTable)
    .where(eq(batchJobsTable.id, batchId))
    .limit(1);

  if (!batch) {
    throw new Error('Batch not found');
  }

  // Cancel QStash messages if we have them and client is available
  if (client && batch.qstashMessageIds && batch.qstashMessageIds.length > 0) {
    const cancelPromises = batch.qstashMessageIds.map(async (messageId) => {
      try {
        await client.messages.delete(messageId);
      } catch (error) {
        // Ignore errors - message may already be processed
        log.warn({ messageId, batchId }, 'Could not cancel message');
      }
    });

    await Promise.allSettled(cancelPromises);
  }

  // Update pending/queued items to skipped
  await db
    .update(batchItemsTable)
    .set({
      status: 'skipped',
      completedAt: new Date(),
    })
    .where(
      and(
        eq(batchItemsTable.batchId, batchId),
        inArray(batchItemsTable.status, ['pending', 'queued'])
      )
    );

  // Update batch status
  await db
    .update(batchJobsTable)
    .set({
      status: 'cancelled',
      completedAt: new Date(),
    })
    .where(eq(batchJobsTable.id, batchId));
}

/**
 * Retry a failed batch item
 */
export async function retryBatchItem(
  itemId: string,
  itemIndex: number,
  batchId: string,
  orgId: string,
  content: string,
  context: Record<string, unknown> | null,
  methodsConfig: MethodsConfig,
  currentRetryCount: number
): Promise<string | null> {
  if (currentRetryCount >= BATCH_QSTASH_CONFIG.MAX_RETRIES) {
    return null;
  }

  const client = getBatchQStashClient();
  if (!client) {
    return null;
  }

  const payload: BatchItemQueuePayload = {
    batchId,
    itemId,
    itemIndex,
    orgId,
    content,
    context,
    methodsConfig,
    attempt: currentRetryCount + 1,
  };

  try {
    const response = await client.publishJSON({
      url: getBatchProcessorUrl(),
      body: payload,
      retries: 0, // No QStash-level retries for manual retries
      timeout: BATCH_QSTASH_CONFIG.TIMEOUT_SECONDS,
    });

    // Update item retry count and status
    await db
      .update(batchItemsTable)
      .set({
        status: 'queued',
        retryCount: currentRetryCount + 1,
        errorMessage: null,
      })
      .where(eq(batchItemsTable.id, itemId));

    return response.messageId;
  } catch (error) {
    log.error({ err: error, itemId, batchId }, 'Failed to retry item');
    return null;
  }
}
