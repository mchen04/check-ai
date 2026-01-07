/**
 * Batch Processing Service
 * Core service for managing batch verification jobs
 */

import { db } from '@/utils/db/db';
import {
  batchJobsTable,
  batchItemsTable,
  verificationsTable,
  paradigmResultsTable,
} from '@/utils/db/schema';
import { eq, desc, and, sql, count } from 'drizzle-orm';
import { queueBatchItems, cancelBatchItems } from './qstash';
import { createAuditLog } from '@/lib/audit/service';
import {
  BATCH_CONSTANTS,
  type BatchJob,
  type BatchItem,
  type BatchJobResponse,
  type BatchItemResponse,
  type BatchResultsResponse,
  type CreateBatchRequest,
  type BatchValidationError,
  type MethodsConfig,
} from './types';

// =============================================================================
// Batch Creation
// =============================================================================

/**
 * Create a new batch job with items
 */
export async function createBatch(
  orgId: string,
  request: CreateBatchRequest,
  items: Array<{
    content: string;
    context?: Record<string, unknown>;
    idempotencyKey?: string;
  }>
): Promise<{ batchId: string; validationErrors: BatchValidationError[] }> {
  const validationErrors: BatchValidationError[] = [];

  // Validate items
  items.forEach((item, index) => {
    if (!item.content || item.content.trim().length === 0) {
      validationErrors.push({ row: index + 1, error: 'Content is required' });
    } else if (item.content.length > 50000) {
      validationErrors.push({ row: index + 1, error: 'Content exceeds maximum length (50000 chars)' });
    }
  });

  // Calculate expiry time (30 days from now)
  const expiresAt = new Date(
    Date.now() + BATCH_CONSTANTS.RESULTS_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  // If there are validation errors, create batch in failed state
  if (validationErrors.length > 0) {
    const [batch] = await db
      .insert(batchJobsTable)
      .values({
        orgId,
        name: request.name || null,
        inputFormat: 'json',
        methodsConfig: request.methods,
        context: request.context || null,
        status: 'failed',
        totalItems: items.length,
        validationErrors,
        errorMessage: `${validationErrors.length} validation error(s)`,
        expiresAt,
      })
      .returning();

    await createAuditLog({
      orgId,
      eventType: 'batch.created',
      description: `Batch job created with ${validationErrors.length} validation error(s)`,
      resourceType: 'batch',
      resourceId: batch.id,
      metadata: {
        status: 'failed',
        validationErrorCount: validationErrors.length,
      },
    });

    return { batchId: batch.id, validationErrors };
  }

  // Create batch job
  const [batch] = await db
    .insert(batchJobsTable)
    .values({
      orgId,
      name: request.name || null,
      inputFormat: 'json',
      methodsConfig: request.methods,
      context: request.context || null,
      status: 'pending',
      totalItems: items.length,
      expiresAt,
    })
    .returning();

  // Create batch items
  const batchItems = items.map((item, index) => ({
    batchId: batch.id,
    itemIndex: index,
    idempotencyKey: item.idempotencyKey || null,
    content: item.content,
    itemContext: item.context || null,
    status: 'pending' as const,
  }));

  const insertedItems = await db.insert(batchItemsTable).values(batchItems).returning();

  // Queue items for processing
  try {
    await queueBatchItems(
      batch.id,
      insertedItems.map((item) => ({
        id: item.id,
        itemIndex: item.itemIndex,
        content: item.content,
        itemContext: item.itemContext as Record<string, unknown> | null,
      })),
      orgId,
      request.methods as MethodsConfig
    );

    await createAuditLog({
      orgId,
      eventType: 'batch.created',
      description: `Batch job created with ${items.length} items`,
      resourceType: 'batch',
      resourceId: batch.id,
      metadata: {
        itemCount: items.length,
        methods: Object.keys(request.methods).filter(
          (k) => (request.methods as Record<string, number>)[k] > 0
        ),
      },
    });
  } catch (error) {
    // If queuing fails, mark batch as failed
    await db
      .update(batchJobsTable)
      .set({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Failed to queue items',
      })
      .where(eq(batchJobsTable.id, batch.id));

    throw error;
  }

  return { batchId: batch.id, validationErrors: [] };
}

// =============================================================================
// Batch Retrieval
// =============================================================================

/**
 * Get a batch job by ID
 */
export async function getBatch(
  batchId: string,
  orgId: string
): Promise<BatchJobResponse | null> {
  const [batch] = await db
    .select()
    .from(batchJobsTable)
    .where(and(eq(batchJobsTable.id, batchId), eq(batchJobsTable.orgId, orgId)))
    .limit(1);

  if (!batch) {
    return null;
  }

  return formatBatchResponse(batch);
}

/**
 * List batch jobs for an organization
 */
export async function listBatches(
  orgId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: string;
  } = {}
): Promise<{
  batches: BatchJobResponse[];
  total: number;
  hasMore: boolean;
}> {
  const { limit = 20, offset = 0, status } = options;

  const whereConditions = [eq(batchJobsTable.orgId, orgId)];
  if (status) {
    whereConditions.push(eq(batchJobsTable.status, status as never));
  }

  const [batches, totalResult] = await Promise.all([
    db
      .select()
      .from(batchJobsTable)
      .where(and(...whereConditions))
      .orderBy(desc(batchJobsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(batchJobsTable)
      .where(and(...whereConditions)),
  ]);

  const total = totalResult[0]?.count || 0;

  return {
    batches: batches.map(formatBatchResponse),
    total,
    hasMore: offset + batches.length < total,
  };
}

/**
 * Get batch results with pagination
 */
export async function getBatchResults(
  batchId: string,
  orgId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: string;
  } = {}
): Promise<BatchResultsResponse | null> {
  const { limit = 50, offset = 0, status } = options;

  // Verify batch belongs to org
  const [batch] = await db
    .select()
    .from(batchJobsTable)
    .where(and(eq(batchJobsTable.id, batchId), eq(batchJobsTable.orgId, orgId)))
    .limit(1);

  if (!batch) {
    return null;
  }

  // Build item query conditions
  const whereConditions = [eq(batchItemsTable.batchId, batchId)];
  if (status) {
    whereConditions.push(eq(batchItemsTable.status, status as never));
  }

  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(batchItemsTable)
      .where(and(...whereConditions))
      .orderBy(batchItemsTable.itemIndex)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(batchItemsTable)
      .where(and(...whereConditions)),
  ]);

  const total = totalResult[0]?.count || 0;

  return {
    batchId,
    status: batch.status,
    summary: {
      totalItems: batch.totalItems,
      processedItems: batch.processedItems,
      successCount: batch.successCount,
      failureCount: batch.failureCount,
      totalCostCents: batch.totalCostCents,
    },
    items: items.map(formatItemResponse),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    },
  };
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Cancel a batch job
 */
export async function cancelBatch(
  batchId: string,
  orgId: string
): Promise<boolean> {
  const [batch] = await db
    .select()
    .from(batchJobsTable)
    .where(and(eq(batchJobsTable.id, batchId), eq(batchJobsTable.orgId, orgId)))
    .limit(1);

  if (!batch) {
    return false;
  }

  // Can only cancel active batches
  if (!['pending', 'validating', 'processing'].includes(batch.status)) {
    return false;
  }

  await cancelBatchItems(batchId);

  await createAuditLog({
    orgId,
    eventType: 'batch.cancelled',
    description: `Batch job cancelled (${batch.processedItems}/${batch.totalItems} items processed)`,
    resourceType: 'batch',
    resourceId: batchId,
    metadata: {
      processedItems: batch.processedItems,
      totalItems: batch.totalItems,
    },
  });

  return true;
}

// =============================================================================
// Batch Item Operations
// =============================================================================

/**
 * Get a single batch item
 */
export async function getBatchItem(
  itemId: string,
  batchId: string,
  orgId: string
): Promise<BatchItemResponse | null> {
  // First verify batch belongs to org
  const [batch] = await db
    .select({ id: batchJobsTable.id })
    .from(batchJobsTable)
    .where(and(eq(batchJobsTable.id, batchId), eq(batchJobsTable.orgId, orgId)))
    .limit(1);

  if (!batch) {
    return null;
  }

  const [item] = await db
    .select()
    .from(batchItemsTable)
    .where(and(eq(batchItemsTable.id, itemId), eq(batchItemsTable.batchId, batchId)))
    .limit(1);

  if (!item) {
    return null;
  }

  return formatItemResponse(item);
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatBatchResponse(batch: typeof batchJobsTable.$inferSelect): BatchJobResponse {
  return {
    id: batch.id,
    name: batch.name,
    status: batch.status,
    totalItems: batch.totalItems,
    processedItems: batch.processedItems,
    successCount: batch.successCount,
    failureCount: batch.failureCount,
    progress: batch.totalItems > 0 ? (batch.processedItems / batch.totalItems) * 100 : 0,
    errorMessage: batch.errorMessage,
    validationErrors: batch.validationErrors as BatchValidationError[] | null,
    totalCostCents: batch.totalCostCents,
    createdAt: batch.createdAt.toISOString(),
    startedAt: batch.startedAt?.toISOString() || null,
    completedAt: batch.completedAt?.toISOString() || null,
  };
}

function formatItemResponse(item: typeof batchItemsTable.$inferSelect): BatchItemResponse {
  return {
    id: item.id,
    itemIndex: item.itemIndex,
    idempotencyKey: item.idempotencyKey,
    content: item.content,
    context: item.itemContext as Record<string, unknown> | null,
    status: item.status,
    verificationId: item.verificationId,
    verdict: item.verdict,
    confidence: item.confidence !== null ? Number(item.confidence) : null,
    decision: item.decision,
    errorMessage: item.errorMessage,
    costCents: item.costCents,
    processingTimeMs: item.processingTimeMs,
    completedAt: item.completedAt?.toISOString() || null,
  };
}

// =============================================================================
// Export Types
// =============================================================================

export type { BatchJobResponse, BatchItemResponse, BatchResultsResponse };
