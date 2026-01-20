/**
 * Trigger.dev Task: Webhook Delivery
 * Delivers webhooks to customer URLs with automatic retries
 */

import { task, logger, AbortTaskRunError } from "@trigger.dev/sdk/v3";
import { db } from "@/utils/db/db";
import { webhooksTable, webhookDeliveriesTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import { createHmac } from "crypto";

// =============================================================================
// Types
// =============================================================================

export interface WebhookDeliveryPayload {
  deliveryId: string;
  webhookId: string;
  orgId: string;
  event: string;
  data: Record<string, unknown>;
}

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  durationMs: number;
  error?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function createWebhookHeaders(
  payload: string,
  secret: string,
  timestamp: string
): Record<string, string> {
  const signature = signPayload(`${timestamp}.${payload}`, secret);

  return {
    "Content-Type": "application/json",
    "X-Webhook-Signature": signature,
    "X-Webhook-Timestamp": timestamp,
    "User-Agent": "Check-Webhooks/1.0",
  };
}

async function deliverWebhook(
  url: string,
  payload: WebhookPayload,
  signingSecret: string
): Promise<DeliveryResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const payloadString = JSON.stringify(payload);
  const headers = createWebhookHeaders(payloadString, signingSecret, timestamp);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const durationMs = Date.now() - startTime;
    let responseBody = "";

    try {
      responseBody = await response.text();
    } catch {
      // Ignore response body errors
    }

    return {
      success: response.ok,
      statusCode: response.status,
      responseBody: responseBody.substring(0, 1000),
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      durationMs,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// Trigger.dev Task
// =============================================================================

export const webhookDeliveryTask = task({
  id: "webhook-delivery",
  retry: {
    maxAttempts: 6,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 60000,
    randomize: false,
  },
  run: async (payload: WebhookDeliveryPayload, { ctx }) => {
    const { deliveryId, webhookId, event, data } = payload;
    const attemptNumber = ctx.attempt.number;

    logger.info("Starting webhook delivery", {
      deliveryId,
      webhookId,
      event,
      attempt: attemptNumber,
    });

    // Get webhook configuration
    const [webhook] = await db
      .select()
      .from(webhooksTable)
      .where(eq(webhooksTable.id, webhookId))
      .limit(1);

    if (!webhook) {
      logger.error("Webhook not found", { webhookId });
      // Mark delivery as failed - don't retry (permanent failure)
      await db
        .update(webhookDeliveriesTable)
        .set({
          status: "failed",
          lastError: "Webhook configuration not found",
          failedAt: new Date(),
        })
        .where(eq(webhookDeliveriesTable.id, deliveryId));
      throw new AbortTaskRunError("Webhook configuration not found");
    }

    if (!webhook.isActive) {
      logger.info("Webhook inactive", { webhookId });
      await db
        .update(webhookDeliveriesTable)
        .set({
          status: "failed",
          lastError: "Webhook is inactive",
          failedAt: new Date(),
        })
        .where(eq(webhookDeliveriesTable.id, deliveryId));
      throw new AbortTaskRunError("Webhook is inactive");
    }

    // Build webhook payload
    const webhookPayload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Deliver to customer's webhook URL
    const result = await deliverWebhook(
      webhook.url,
      webhookPayload,
      webhook.signingSecret
    );

    // Build attempt record
    const attemptRecord = {
      attemptNumber,
      timestamp: new Date().toISOString(),
      responseStatus: result.statusCode,
      responseBody: result.responseBody,
      durationMs: result.durationMs,
      error: result.error,
    };

    // Get current attempt history
    const [currentDelivery] = await db
      .select({ attemptHistory: webhookDeliveriesTable.attemptHistory })
      .from(webhookDeliveriesTable)
      .where(eq(webhookDeliveriesTable.id, deliveryId))
      .limit(1);

    const attemptHistory = Array.isArray(currentDelivery?.attemptHistory)
      ? [...currentDelivery.attemptHistory, attemptRecord]
      : [attemptRecord];

    // Update delivery record
    await db
      .update(webhookDeliveriesTable)
      .set({
        status: result.success ? "delivered" : "retrying",
        attemptNumber,
        responseStatus: result.statusCode,
        responseBody: result.responseBody,
        durationMs: result.durationMs,
        lastError: result.error,
        deliveredAt: result.success ? new Date() : null,
        attemptHistory,
      })
      .where(eq(webhookDeliveriesTable.id, deliveryId));

    // Update webhook status
    await db
      .update(webhooksTable)
      .set({
        lastTriggeredAt: new Date(),
        lastStatus: result.statusCode,
        failureCount: result.success ? 0 : webhook.failureCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(webhooksTable.id, webhookId));

    if (result.success) {
      logger.info("Webhook delivered successfully", {
        deliveryId,
        attempt: attemptNumber,
      });
      return { success: true, deliveryId };
    }

    logger.warn("Webhook delivery failed", {
      deliveryId,
      attempt: attemptNumber,
      error: result.error || `HTTP ${result.statusCode}`,
    });

    // Throw error to trigger retry
    throw new Error(result.error || `HTTP ${result.statusCode}`);
  },
  // Handle final failure after all retries exhausted
  onFailure: async (payload, error) => {
    const { deliveryId, webhookId } = payload;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("All webhook delivery attempts exhausted", {
      deliveryId,
      webhookId,
      error: errorMessage,
    });

    // Mark delivery as permanently failed
    await db
      .update(webhookDeliveriesTable)
      .set({
        status: "failed",
        failedAt: new Date(),
        lastError: `All retries exhausted: ${errorMessage}`,
      })
      .where(eq(webhookDeliveriesTable.id, deliveryId));

    // Check if webhook should be auto-disabled
    const [webhook] = await db
      .select()
      .from(webhooksTable)
      .where(eq(webhooksTable.id, webhookId))
      .limit(1);

    if (webhook && webhook.failureCount >= 9) {
      await db
        .update(webhooksTable)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(webhooksTable.id, webhookId));

      logger.warn("Auto-disabled webhook due to repeated failures", {
        webhookId,
      });
    }
  },
});
