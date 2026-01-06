import { createHmac, randomBytes } from 'crypto';
import { db } from '@/utils/db/db';
import { webhooksTable, webhookDeliveriesTable } from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getQStashClient,
  getWebhookHandlerBaseUrl,
  MAX_RETRIES,
  RETRY_DELAY_FORMULA,
  WEBHOOK_TIMEOUT_SECONDS,
  type QueuedWebhookPayload,
} from './qstash';

// =============================================================================
// Types
// =============================================================================

export type WebhookEvent =
  | 'verification.completed'
  | 'verification.escalated'
  | 'escalation.resolved'
  | 'usage.limit.warning'
  | 'usage.limit.reached'
  | 'test';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  durationMs: number;
  error?: string;
}

// =============================================================================
// Signing
// =============================================================================

/**
 * Generate a new signing secret for webhooks
 */
export function generateSigningSecret(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Sign a webhook payload with HMAC-SHA256
 */
export function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Create webhook headers including signature
 */
export function createWebhookHeaders(
  payload: string,
  secret: string,
  timestamp: string
): Record<string, string> {
  const signature = signPayload(`${timestamp}.${payload}`, secret);

  return {
    'Content-Type': 'application/json',
    'X-Webhook-Signature': signature,
    'X-Webhook-Timestamp': timestamp,
    'User-Agent': 'VerifyAI-Webhooks/1.0',
  };
}

// =============================================================================
// Direct Delivery (used by QStash handler or fallback)
// =============================================================================

/**
 * Deliver a webhook directly to a URL
 * This is called by the QStash handler endpoint or as fallback when QStash is not configured
 */
export async function deliverWebhook(
  url: string,
  payload: WebhookPayload,
  signingSecret: string
): Promise<WebhookDeliveryResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const payloadString = JSON.stringify(payload);
  const headers = createWebhookHeaders(payloadString, signingSecret, timestamp);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const durationMs = Date.now() - startTime;
    let responseBody = '';

    try {
      responseBody = await response.text();
    } catch {
      // Ignore response body errors
    }

    return {
      success: response.ok,
      statusCode: response.status,
      responseBody: responseBody.substring(0, 1000), // Limit stored response
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      durationMs,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// Queue-based Delivery (with retries via QStash)
// =============================================================================

/**
 * Queue a webhook delivery via QStash for automatic retries
 * Falls back to immediate delivery if QStash is not configured
 */
export async function queueWebhookDelivery(
  webhookId: string,
  orgId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<string> {
  // Create delivery record first with pending status
  const [delivery] = await db
    .insert(webhookDeliveriesTable)
    .values({
      webhookId,
      event,
      payload: data,
      status: 'pending',
      maxAttempts: MAX_RETRIES + 1,
      attemptNumber: 0, // Will be set to 1 on first attempt
      success: false,
    })
    .returning();

  const client = getQStashClient();

  if (!client) {
    // Fallback: QStash not configured, deliver immediately without retries
    console.warn('[Webhook] QStash not configured, using immediate delivery');
    await deliverWebhookImmediate(delivery.id, webhookId, event, data);
    return delivery.id;
  }

  try {
    // Get webhook to verify it's active
    const [webhook] = await db
      .select()
      .from(webhooksTable)
      .where(eq(webhooksTable.id, webhookId))
      .limit(1);

    if (!webhook || !webhook.isActive) {
      // Mark as failed if webhook is not active
      await db
        .update(webhookDeliveriesTable)
        .set({
          status: 'failed',
          lastError: 'Webhook not found or inactive',
          failedAt: new Date(),
        })
        .where(eq(webhookDeliveriesTable.id, delivery.id));
      return delivery.id;
    }

    // Queue via QStash
    const handlerUrl = getWebhookHandlerBaseUrl();
    const queuePayload: QueuedWebhookPayload = {
      deliveryId: delivery.id,
      webhookId,
      orgId,
      event,
      data,
      attempt: 1,
    };

    const response = await client.publishJSON({
      url: handlerUrl,
      body: queuePayload,
      retries: MAX_RETRIES,
      callback: `${handlerUrl}/callback`,
      failureCallback: `${handlerUrl}/failure`,
      timeout: WEBHOOK_TIMEOUT_SECONDS,
    });

    // Update delivery with QStash message ID
    await db
      .update(webhookDeliveriesTable)
      .set({
        qstashMessageId: response.messageId,
        status: 'processing',
      })
      .where(eq(webhookDeliveriesTable.id, delivery.id));

    return delivery.id;
  } catch (error) {
    console.error('[Webhook] Failed to queue via QStash:', error);

    // Fallback to immediate delivery on QStash error
    await deliverWebhookImmediate(delivery.id, webhookId, event, data);
    return delivery.id;
  }
}

/**
 * Deliver webhook immediately without QStash (fallback)
 */
async function deliverWebhookImmediate(
  deliveryId: string,
  webhookId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const [webhook] = await db
      .select()
      .from(webhooksTable)
      .where(eq(webhooksTable.id, webhookId))
      .limit(1);

    if (!webhook || !webhook.isActive) {
      await db
        .update(webhookDeliveriesTable)
        .set({
          status: 'failed',
          lastError: 'Webhook not found or inactive',
          failedAt: new Date(),
          attemptNumber: 1,
        })
        .where(eq(webhookDeliveriesTable.id, deliveryId));
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const result = await deliverWebhook(webhook.url, payload, webhook.signingSecret);

    // Update delivery record
    await db
      .update(webhookDeliveriesTable)
      .set({
        status: result.success ? 'delivered' : 'failed',
        attemptNumber: 1,
        responseStatus: result.statusCode,
        responseBody: result.responseBody || result.error,
        durationMs: result.durationMs,
        lastError: result.error,
        deliveredAt: result.success ? new Date() : null,
        failedAt: result.success ? null : new Date(),
        success: result.success,
        attemptHistory: [
          {
            attemptNumber: 1,
            timestamp: new Date().toISOString(),
            responseStatus: result.statusCode,
            responseBody: result.responseBody,
            durationMs: result.durationMs,
            error: result.error,
          },
        ],
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

    // Disable webhook after too many failures
    if (!result.success && webhook.failureCount >= 9) {
      await db
        .update(webhooksTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(webhooksTable.id, webhookId));
    }
  } catch (error) {
    console.error('[Webhook] Immediate delivery failed:', error);
    await db
      .update(webhookDeliveriesTable)
      .set({
        status: 'failed',
        lastError: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date(),
        attemptNumber: 1,
      })
      .where(eq(webhookDeliveriesTable.id, deliveryId));
  }
}

// =============================================================================
// Event Firing (Main Entry Point)
// =============================================================================

/**
 * Fire webhooks for an event to all active webhooks in an organization
 * Uses QStash for automatic retries when configured
 */
export async function fireWebhooks(
  orgId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  try {
    // Get all active webhooks that listen to this event
    const webhooks = await db
      .select()
      .from(webhooksTable)
      .where(and(eq(webhooksTable.orgId, orgId), eq(webhooksTable.isActive, true)));

    // Filter webhooks that subscribe to this event
    const subscribedWebhooks = webhooks.filter((webhook) =>
      webhook.events.includes(event)
    );

    if (subscribedWebhooks.length === 0) {
      return;
    }

    // Queue all webhook deliveries (non-blocking)
    const queuePromises = subscribedWebhooks.map((webhook) =>
      queueWebhookDelivery(webhook.id, orgId, event, data).catch((error) => {
        console.error(`[Webhook] Failed to queue delivery for ${webhook.id}:`, error);
      })
    );

    // Don't await - fire and forget for performance
    Promise.all(queuePromises).catch((error) => {
      console.error('[Webhook] Error queuing webhooks:', error);
    });
  } catch (error) {
    console.error('[Webhook] Error fetching webhooks:', error);
  }
}

// =============================================================================
// Manual Replay
// =============================================================================

/**
 * Manually retry a failed webhook delivery
 * Creates a new delivery record and queues it
 */
export async function retryWebhookDelivery(
  deliveryId: string,
  orgId: string
): Promise<string | null> {
  try {
    // Get the original delivery
    const [delivery] = await db
      .select()
      .from(webhookDeliveriesTable)
      .where(eq(webhookDeliveriesTable.id, deliveryId))
      .limit(1);

    if (!delivery) {
      return null;
    }

    // Verify the webhook belongs to this org
    const [webhook] = await db
      .select()
      .from(webhooksTable)
      .where(
        and(eq(webhooksTable.id, delivery.webhookId), eq(webhooksTable.orgId, orgId))
      )
      .limit(1);

    if (!webhook) {
      return null;
    }

    // Queue a new delivery with the same payload
    const newDeliveryId = await queueWebhookDelivery(
      webhook.id,
      orgId,
      delivery.event as WebhookEvent,
      delivery.payload as Record<string, unknown>
    );

    return newDeliveryId;
  } catch (error) {
    console.error('[Webhook] Error retrying delivery:', error);
    return null;
  }
}

// =============================================================================
// Test Webhook
// =============================================================================

/**
 * Send a test webhook to verify configuration
 * Test webhooks are delivered immediately without QStash
 */
export async function sendTestWebhook(webhookId: string): Promise<WebhookDeliveryResult> {
  const [webhook] = await db
    .select()
    .from(webhooksTable)
    .where(eq(webhooksTable.id, webhookId))
    .limit(1);

  if (!webhook) {
    return {
      success: false,
      durationMs: 0,
      error: 'Webhook not found',
    };
  }

  const payload: WebhookPayload = {
    event: 'test',
    timestamp: new Date().toISOString(),
    data: {
      message: 'This is a test webhook from VerifyAI',
      webhookId: webhook.id,
    },
  };

  const result = await deliverWebhook(webhook.url, payload, webhook.signingSecret);

  // Log test delivery with new status format
  await db.insert(webhookDeliveriesTable).values({
    webhookId: webhook.id,
    event: 'test',
    payload: payload.data,
    status: result.success ? 'delivered' : 'failed',
    attemptNumber: 1,
    maxAttempts: 1,
    responseStatus: result.statusCode,
    responseBody: result.responseBody || result.error,
    durationMs: result.durationMs,
    lastError: result.error,
    deliveredAt: result.success ? new Date() : null,
    failedAt: result.success ? null : new Date(),
    success: result.success,
    attemptHistory: [
      {
        attemptNumber: 1,
        timestamp: new Date().toISOString(),
        responseStatus: result.statusCode,
        responseBody: result.responseBody,
        durationMs: result.durationMs,
        error: result.error,
      },
    ],
  });

  return result;
}
