import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { webhooksTable, webhookDeliveriesTable } from '@/utils/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getQStashReceiver, type QueuedWebhookPayload } from '@/lib/webhooks/qstash';
import { deliverWebhook, type WebhookPayload } from '@/lib/webhooks/service';

/**
 * QStash Webhook Delivery Handler
 *
 * This endpoint is called by QStash to deliver webhooks to customer URLs.
 * It handles signature verification, actual delivery, and status updates.
 *
 * Flow:
 * 1. Verify QStash signature
 * 2. Fetch webhook config from DB
 * 3. Deliver webhook to customer URL
 * 4. Update delivery record with attempt result
 * 5. Return appropriate status (success = 200, failure = 500 to trigger retry)
 */
export async function POST(request: NextRequest) {
  const receiver = getQStashReceiver();

  // Get signature and body
  const signature = request.headers.get('upstash-signature');
  const body = await request.text();

  // Verify QStash signature if receiver is configured
  if (receiver && signature) {
    try {
      await receiver.verify({
        signature,
        body,
        url: request.url,
      });
    } catch (error) {
      console.error('[Webhook Handler] Signature verification failed:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else if (!receiver) {
    console.warn('[Webhook Handler] QStash receiver not configured, skipping signature verification');
  }

  // Parse the queued payload
  let payload: QueuedWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { deliveryId, webhookId, event, data, attempt } = payload;

  // Get webhook configuration
  const [webhook] = await db
    .select()
    .from(webhooksTable)
    .where(eq(webhooksTable.id, webhookId))
    .limit(1);

  if (!webhook) {
    console.error(`[Webhook Handler] Webhook not found: ${webhookId}`);
    // Mark delivery as failed
    await db
      .update(webhookDeliveriesTable)
      .set({
        status: 'failed',
        lastError: 'Webhook configuration not found',
        failedAt: new Date(),
      })
      .where(eq(webhookDeliveriesTable.id, deliveryId));
    // Return 200 to prevent QStash retries (webhook doesn't exist)
    return NextResponse.json({ error: 'Webhook not found' }, { status: 200 });
  }

  if (!webhook.isActive) {
    console.log(`[Webhook Handler] Webhook inactive: ${webhookId}`);
    await db
      .update(webhookDeliveriesTable)
      .set({
        status: 'failed',
        lastError: 'Webhook is inactive',
        failedAt: new Date(),
      })
      .where(eq(webhookDeliveriesTable.id, deliveryId));
    // Return 200 to prevent QStash retries (webhook is intentionally disabled)
    return NextResponse.json({ error: 'Webhook inactive' }, { status: 200 });
  }

  // Build webhook payload for customer
  const webhookPayload: WebhookPayload = {
    event: event as WebhookPayload['event'],
    timestamp: new Date().toISOString(),
    data,
  };

  // Deliver to customer's webhook URL
  const result = await deliverWebhook(webhook.url, webhookPayload, webhook.signingSecret);

  // Build attempt record
  const attemptRecord = {
    attemptNumber: attempt,
    timestamp: new Date().toISOString(),
    responseStatus: result.statusCode,
    responseBody: result.responseBody,
    durationMs: result.durationMs,
    error: result.error,
  };

  // Update delivery record
  await db
    .update(webhookDeliveriesTable)
    .set({
      status: result.success ? 'delivered' : 'retrying',
      attemptNumber: attempt,
      responseStatus: result.statusCode,
      responseBody: result.responseBody,
      durationMs: result.durationMs,
      lastError: result.error,
      deliveredAt: result.success ? new Date() : null,
      success: result.success,
      // Append to attempt history using PostgreSQL JSONB concatenation
      attemptHistory: sql`COALESCE(${webhookDeliveriesTable.attemptHistory}, '[]'::jsonb) || ${JSON.stringify([attemptRecord])}::jsonb`,
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
    console.log(`[Webhook Handler] Delivered successfully: ${deliveryId} (attempt ${attempt})`);
    return NextResponse.json({ success: true, deliveryId });
  } else {
    console.warn(`[Webhook Handler] Delivery failed: ${deliveryId} (attempt ${attempt}): ${result.error || result.statusCode}`);
    // Return 500 to trigger QStash retry
    return NextResponse.json(
      {
        error: result.error || `HTTP ${result.statusCode}`,
        deliveryId,
        attempt,
      },
      { status: result.statusCode || 500 }
    );
  }
}
