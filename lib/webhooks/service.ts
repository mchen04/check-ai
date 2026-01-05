import { createHmac, randomBytes } from 'crypto';
import { db } from '@/utils/db/db';
import { webhooksTable, webhookDeliveriesTable } from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';

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
// Delivery
// =============================================================================

/**
 * Deliver a webhook to a URL with retry logic
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
// Event Firing
// =============================================================================

/**
 * Fire webhooks for an event to all active webhooks in an organization
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

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Fire webhooks in parallel (fire and forget for performance)
    const deliveryPromises = subscribedWebhooks.map(async (webhook) => {
      const result = await deliverWebhook(webhook.url, payload, webhook.signingSecret);

      // Log delivery
      try {
        await db.insert(webhookDeliveriesTable).values({
          webhookId: webhook.id,
          event,
          payload: data,
          responseStatus: result.statusCode,
          responseBody: result.responseBody || result.error,
          durationMs: result.durationMs,
          success: result.success,
        });

        // Update webhook status
        await db
          .update(webhooksTable)
          .set({
            lastTriggeredAt: new Date(),
            lastStatus: result.statusCode,
            failureCount: result.success ? 0 : webhook.failureCount + 1,
            updatedAt: new Date(),
          })
          .where(eq(webhooksTable.id, webhook.id));

        // Disable webhook after too many failures
        if (!result.success && webhook.failureCount >= 9) {
          await db
            .update(webhooksTable)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(webhooksTable.id, webhook.id));
        }
      } catch (logError) {
        console.error('Error logging webhook delivery:', logError);
      }
    });

    // Don't await - fire and forget
    Promise.all(deliveryPromises).catch((error) => {
      console.error('Error firing webhooks:', error);
    });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
  }
}

// =============================================================================
// Test Webhook
// =============================================================================

/**
 * Send a test webhook to verify configuration
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

  // Log test delivery
  await db.insert(webhookDeliveriesTable).values({
    webhookId: webhook.id,
    event: 'test',
    payload: payload.data,
    responseStatus: result.statusCode,
    responseBody: result.responseBody || result.error,
    durationMs: result.durationMs,
    success: result.success,
  });

  return result;
}
