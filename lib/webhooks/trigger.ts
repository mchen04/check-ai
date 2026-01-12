/**
 * Trigger.dev Integration for Webhooks
 * Replaces QStash for webhook delivery with automatic retries
 */

import { tasks } from "@trigger.dev/sdk";
import type { webhookDeliveryTask } from "@/trigger/webhook-delivery";
import { createLogger } from "@/lib/logger";

const log = createLogger("Webhook Trigger");

// =============================================================================
// Configuration
// =============================================================================

export const WEBHOOK_CONFIG = {
  MAX_RETRIES: 5,
  TIMEOUT_SECONDS: 30,
} as const;

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
 * Queue a webhook delivery via Trigger.dev
 * Returns the task handle ID
 */
export async function queueWebhookWithTrigger(
  payload: WebhookDeliveryPayload
): Promise<string> {
  if (!isTriggerConfigured()) {
    throw new Error("Trigger.dev not configured");
  }

  try {
    const handle = await tasks.trigger<typeof webhookDeliveryTask>(
      "webhook-delivery",
      payload
    );

    log.info(
      { deliveryId: payload.deliveryId, taskId: handle.id },
      "Webhook delivery queued with Trigger.dev"
    );

    return handle.id;
  } catch (error) {
    log.error(
      { err: error, deliveryId: payload.deliveryId },
      "Failed to queue webhook with Trigger.dev"
    );
    throw error;
  }
}
