/**
 * Trigger.dev Task: Batch Item Processing
 * Processes individual batch verification items with automatic retries
 */

// Load environment variables from .env.local for local development
import { config } from "dotenv";
config({ path: ".env.local" });
import { eq } from "drizzle-orm";
import { task, logger, AbortTaskRunError } from "@trigger.dev/sdk/v3";
import { db } from "@/utils/db/db";
import {
  batchJobsTable,
  batchItemsTable,
  verificationsTable,
  paradigmResultsTable,
  usageTable,
  organizationsTable,
} from "@/utils/db/schema";
import {
  updateBatchItemResult,
  updateBatchProgress,
  completeBatch,
  isBatchActive,
  markItemProcessing,
} from "@/lib/batch";
import { VerificationOrchestrator } from "@/lib/verification";
import { getDecryptedApiKeys } from "@/lib/llm/key-manager";
import {
  broadcastBatchItemComplete,
  broadcastBatchComplete,
} from "@/utils/supabase/realtime";
import type { MethodsConfig } from "@/lib/batch/types";
import type { MethodOverrides } from "@/lib/verification/validator";
import type { VerifyOptions } from "@/lib/verification/types";

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
// Configuration
// =============================================================================

const BATCH_CONFIG = {
  TIMEOUT_MS: 120000, // 2 minutes per item
  MAX_RETRIES: 3,
} as const;

// =============================================================================
// Trigger.dev Task
// =============================================================================

export const batchItemProcessingTask = task({
  id: "batch-item-processing",
  retry: {
    maxAttempts: BATCH_CONFIG.MAX_RETRIES + 1,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    randomize: false,
  },
  run: async (payload: BatchItemPayload, { ctx }) => {
    const { batchId, itemId, itemIndex, orgId, content, context, methodsConfig, methodOverrides, options } = payload;
    const attemptNumber = ctx.attempt.number;

    logger.info("Processing batch item", {
      batchId,
      itemId,
      itemIndex,
      attempt: attemptNumber,
    });

    // Check if batch is still active (not cancelled)
    const active = await isBatchActive(batchId);
    if (!active) {
      logger.info("Batch is no longer active, skipping item", { batchId, itemId });
      throw new AbortTaskRunError("Batch is no longer active");
    }

    // Mark item as processing
    await markItemProcessing(itemId);

    const startTime = Date.now();

    try {
      // Get API keys for the organization
      const keys = await getDecryptedApiKeys(orgId);

      if (Object.keys(keys).length === 0) {
        throw new AbortTaskRunError("No API keys configured for organization");
      }

      // Create orchestrator
      const orchestrator = new VerificationOrchestrator({
        keys,
        defaultTimeout: BATCH_CONFIG.TIMEOUT_MS,
      });

      // Run verification with user-configurable options
      const result = await orchestrator.verify(content, {
        context: context || undefined,
        methods: methodsConfig,
        methodOverrides,
        timeout: options?.timeout,
        minConfidence: options?.minConfidence,
        acceptThreshold: options?.acceptThreshold,
        escalateThreshold: options?.escalateThreshold,
        maxRetries: options?.maxRetries,
        retryOnLowConfidence: options?.retryOnLowConfidence,
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
          status: result.decision === "escalate" ? "escalated" : "completed",
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
        provider: "mixed",
        model: "mixed",
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
        const finalStatus = progress.failureCount === progress.totalItems ? "failed" : "completed";
        await broadcastBatchComplete(batchId, finalStatus, {
          totalItems: progress.totalItems,
          successCount: progress.successCount,
          failureCount: progress.failureCount,
          totalCostCents: 0,
        });
      }

      logger.info("Batch item processed successfully", {
        batchId,
        itemId,
        verificationId: verification.id,
      });

      return {
        success: true,
        verificationId: verification.id,
        verdict: result.verdict,
        confidence: result.confidence,
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      logger.error("Error processing batch item", {
        batchId,
        itemId,
        attempt: attemptNumber,
        error: errorMessage,
      });

      // Update item with retry info (don't mark as failed yet)
      await db
        .update(batchItemsTable)
        .set({
          status: "queued",
          retryCount: attemptNumber,
          errorMessage: `Retry ${attemptNumber}: ${errorMessage}`,
        })
        .where(eq(batchItemsTable.id, itemId));

      // Re-throw to trigger retry
      throw error;
    }
  },
  // Handle final failure after all retries exhausted
  onFailure: async ({ payload, error }) => {
    const { batchId, itemId, itemIndex, orgId } = payload;
    const processingTimeMs = 0;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("All batch item processing attempts exhausted", {
      batchId,
      itemId,
      error: errorMessage,
    });

    // Mark as permanently failed
    await updateBatchItemResult(itemId, {
      itemId,
      success: false,
      error: errorMessage,
      processingTimeMs,
    });

    // Update batch progress (failure)
    const progress = await updateBatchProgress(batchId, false);

    // Broadcast item failure for real-time updates
    await broadcastBatchItemComplete(batchId, itemId, itemIndex, false, {
      processed: progress.processedItems,
      success: progress.successCount,
      failed: progress.failureCount,
      total: progress.totalItems,
    });

    // Check if batch is complete
    if (progress.isComplete) {
      await completeBatch(batchId, orgId);

      // Broadcast batch completion
      const finalStatus = progress.failureCount === progress.totalItems ? "failed" : "completed";
      await broadcastBatchComplete(batchId, finalStatus, {
        totalItems: progress.totalItems,
        successCount: progress.successCount,
        failureCount: progress.failureCount,
        totalCostCents: 0,
      });
    }
  },
});
