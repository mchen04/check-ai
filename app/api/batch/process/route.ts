/**
 * POST /api/batch/process - QStash handler for batch item processing
 * This endpoint is called by QStash to process individual batch items
 */

import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { db } from '@/utils/db/db';
import {
  batchJobsTable,
  batchItemsTable,
  verificationsTable,
  paradigmResultsTable,
  usageTable,
  organizationsTable,
} from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  updateBatchItemResult,
  updateBatchProgress,
  completeBatch,
  isBatchActive,
  markItemProcessing,
  BATCH_QSTASH_CONFIG,
} from '@/lib/batch';
import type { BatchItemQueuePayload } from '@/lib/batch';
import { VerificationOrchestrator } from '@/lib/verification';
import { getDecryptedApiKeys } from '@/lib/llm/key-manager';
import {
  broadcastBatchItemComplete,
  broadcastBatchComplete,
} from '@/utils/supabase/realtime';

// Maximum request body size (1MB)
const MAX_BODY_SIZE = 1024 * 1024;

// =============================================================================
// QStash Signature Verification
// =============================================================================

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
});

async function verifyQStashSignature(req: NextRequest, body: string): Promise<boolean> {
  const hasSigningKeys = process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY;

  // In production, signing keys are required
  if (process.env.NODE_ENV === 'production' && !hasSigningKeys) {
    console.error('[Batch Process] CRITICAL: QStash signing keys not configured in production');
    throw new Error('QStash signing keys not configured');
  }

  // Skip verification in development if not configured
  if (process.env.NODE_ENV === 'development' && !hasSigningKeys) {
    console.warn('[Batch Process] Skipping QStash signature verification in development');
    return true;
  }

  const signature = req.headers.get('upstash-signature');
  if (!signature) {
    return false;
  }

  try {
    await receiver.verify({
      signature,
      body,
    });
    return true;
  } catch (error) {
    console.error('[Batch Process] QStash signature verification failed:', error);
    return false;
  }
}

// =============================================================================
// Batch Item Processing
// =============================================================================

async function processBatchItem(
  payload: BatchItemQueuePayload,
  retryAttempt: number
): Promise<void> {
  const { batchId, itemId, itemIndex, orgId, content, context, methodsConfig } = payload;

  // Check if batch is still active (not cancelled)
  const active = await isBatchActive(batchId);
  if (!active) {
    console.log(`[Batch Process] Batch ${batchId} is no longer active, skipping item ${itemId}`);
    return;
  }

  // Mark item as processing
  await markItemProcessing(itemId);

  const startTime = Date.now();

  try {
    // Get API keys for the organization
    const keys = await getDecryptedApiKeys(orgId);

    if (Object.keys(keys).length === 0) {
      throw new Error('No API keys configured for organization');
    }

    // Create orchestrator - use shared config for timeout
    const orchestrator = new VerificationOrchestrator({
      keys,
      defaultTimeout: BATCH_QSTASH_CONFIG.TIMEOUT_SECONDS * 1000, // Convert to ms
    });

    // Run verification
    const result = await orchestrator.verify(content, {
      context: context || undefined,
      methods: methodsConfig,
    });

    const processingTimeMs = Date.now() - startTime;

    // Fetch organization retention settings
    const [org] = await db
      .select({
        verificationRetentionDays: organizationsTable.verificationRetentionDays,
        dataRetentionEnabled: organizationsTable.dataRetentionEnabled,
      })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, orgId))
      .limit(1);

    // Calculate expiresAt based on org retention settings
    const expiresAt = org?.dataRetentionEnabled
      ? new Date(Date.now() + (org?.verificationRetentionDays ?? 30) * 24 * 60 * 60 * 1000)
      : null;

    // Store verification record
    const [verification] = await db
      .insert(verificationsTable)
      .values({
        orgId,
        content,
        context: context || null,
        methodsConfig,
        status: result.decision === 'escalate' ? 'escalated' : 'completed',
        finalVerdict: result.verdict,
        confidenceScore: result.confidence.toFixed(4),
        decision: result.decision,
        reasoning: result.reasoning,
        processingTimeMs,
        costCents: Math.round(result.costCents),
        completedAt: new Date(),
        expiresAt,
      })
      .returning();

    // Store paradigm results
    if (result.paradigmResults.length > 0) {
      await db.insert(paradigmResultsTable).values(
        result.paradigmResults.map((pr) => ({
          verificationId: verification.id,
          paradigmType: pr.paradigm,
          weight: pr.weight.toFixed(2),
          provider: pr.provider,
          model: pr.model,
          verdict: pr.verdict,
          confidence: pr.confidence.toFixed(4),
          reasoning: pr.reasoning,
          tokenUsage: pr.tokenUsage || null,
          processingTimeMs: pr.processingTimeMs,
          costCents: Math.round(pr.costCents),
          errorMessage: pr.error || null,
        }))
      );
    }

    // Track usage
    const totalInputTokens = result.paradigmResults.reduce(
      (sum, pr) => sum + (pr.tokenUsage?.inputTokens || 0),
      0
    );
    const totalOutputTokens = result.paradigmResults.reduce(
      (sum, pr) => sum + (pr.tokenUsage?.outputTokens || 0),
      0
    );

    await db.insert(usageTable).values({
      orgId,
      verificationId: verification.id,
      provider: 'mixed',
      model: 'mixed',
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      costCents: Math.round(result.costCents),
    });

    // Update batch item with success
    await updateBatchItemResult(itemId, {
      itemId,
      success: true,
      verificationId: verification.id,
      verdict: result.verdict || undefined,
      confidence: result.confidence,
      decision: result.decision,
      costCents: Math.round(result.costCents),
      processingTimeMs,
    });

    // Update batch progress
    const progress = await updateBatchProgress(
      batchId,
      true,
      Math.round(result.costCents),
      totalInputTokens,
      totalOutputTokens
    );

    // Broadcast item completion for real-time updates
    await broadcastBatchItemComplete(
      batchId,
      itemId,
      itemIndex,
      true,
      {
        processed: progress.processedItems,
        success: progress.successCount,
        failed: progress.failureCount,
        total: progress.totalItems,
      },
      result.verdict || undefined,
      result.confidence
    );

    // Check if batch is complete
    if (progress.isComplete) {
      await completeBatch(batchId, orgId);

      // Broadcast batch completion
      const finalStatus = progress.failureCount === progress.totalItems ? 'failed' : 'completed';
      await broadcastBatchComplete(batchId, finalStatus, {
        totalItems: progress.totalItems,
        successCount: progress.successCount,
        failureCount: progress.failureCount,
        totalCostCents: 0, // Will be updated from completeBatch
      });
    }
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isFinalAttempt = retryAttempt >= BATCH_QSTASH_CONFIG.MAX_RETRIES;

    console.error(
      `[Batch Process] Error processing item ${itemId} (attempt ${retryAttempt}/${BATCH_QSTASH_CONFIG.MAX_RETRIES}):`,
      error
    );

    if (isFinalAttempt) {
      // Final attempt - mark as permanently failed and update batch progress
      await updateBatchItemResult(itemId, {
        itemId,
        success: false,
        error: errorMessage,
        processingTimeMs,
      });

      // Update batch progress (failure)
      const progress = await updateBatchProgress(batchId, false);

      // Broadcast item failure for real-time updates
      await broadcastBatchItemComplete(
        batchId,
        itemId,
        itemIndex,
        false,
        {
          processed: progress.processedItems,
          success: progress.successCount,
          failed: progress.failureCount,
          total: progress.totalItems,
        }
      );

      // Check if batch is complete
      if (progress.isComplete) {
        await completeBatch(batchId, orgId);

        // Broadcast batch completion
        const finalStatus = progress.failureCount === progress.totalItems ? 'failed' : 'completed';
        await broadcastBatchComplete(batchId, finalStatus, {
          totalItems: progress.totalItems,
          successCount: progress.successCount,
          failureCount: progress.failureCount,
          totalCostCents: 0,
        });
      }

      // Return success to prevent further QStash retries (we've exhausted our attempts)
      return;
    }

    // Not final attempt - update retry count but don't mark as failed yet
    await db
      .update(batchItemsTable)
      .set({
        status: 'queued', // Reset to queued for retry
        retryCount: retryAttempt,
        errorMessage: `Retry ${retryAttempt}: ${errorMessage}`,
      })
      .where(eq(batchItemsTable.id, itemId));

    // Re-throw to trigger QStash retry
    throw error;
  }
}

// =============================================================================
// Route Handler
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Check content length before reading body
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
  }

  const bodyText = await req.text();

  // Double-check actual size after reading
  if (bodyText.length > MAX_BODY_SIZE) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
  }

  // Verify QStash signature
  const isValid = await verifyQStashSignature(req, bodyText);
  if (!isValid) {
    console.error('[Batch Process] Invalid QStash signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: BatchItemQueuePayload;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  // Validate payload
  if (!payload.batchId || !payload.itemId || !payload.orgId || !payload.content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Get retry count from QStash header (0-indexed, so add 1 for attempt number)
  const qstashRetried = req.headers.get('upstash-retried');
  const retryAttempt = qstashRetried ? parseInt(qstashRetried, 10) + 1 : 1;

  try {
    await processBatchItem(payload, retryAttempt);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Batch Process] Processing failed:', error);
    // Return 500 to trigger QStash retry
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}
