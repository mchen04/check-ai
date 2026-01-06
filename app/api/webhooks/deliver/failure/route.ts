import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { webhooksTable, webhookDeliveriesTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';
import { getQStashReceiver } from '@/lib/webhooks/qstash';

/**
 * QStash Failure Callback Handler
 *
 * Called by QStash when all retry attempts have been exhausted.
 * This endpoint marks the delivery as failed (moved to DLQ).
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
      console.error('[Webhook Failure] Signature verification failed:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Parse failure callback payload
  // QStash sends: { body, sourceBody, url, sourceMessageId, ... }
  let failureData: {
    body?: string;
    sourceBody?: string;
    sourceMessageId?: string;
    dlqId?: string;
  };
  try {
    failureData = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // The sourceBody contains the original request body
  let originalPayload: { deliveryId?: string; webhookId?: string };
  try {
    originalPayload = failureData.sourceBody ? JSON.parse(failureData.sourceBody) : {};
  } catch {
    originalPayload = {};
  }

  const { deliveryId, webhookId } = originalPayload;

  if (!deliveryId) {
    console.error('[Webhook Failure] No deliveryId in failure callback');
    return NextResponse.json({ error: 'Missing deliveryId' }, { status: 400 });
  }

  // Mark delivery as failed (in DLQ)
  await db
    .update(webhookDeliveriesTable)
    .set({
      status: 'failed',
      failedAt: new Date(),
      dlqId: failureData.dlqId || failureData.sourceMessageId,
    })
    .where(eq(webhookDeliveriesTable.id, deliveryId));

  console.warn(`[Webhook Failure] All retries exhausted: ${deliveryId}`);

  // Check if webhook should be auto-disabled
  if (webhookId) {
    const [webhook] = await db
      .select()
      .from(webhooksTable)
      .where(eq(webhooksTable.id, webhookId))
      .limit(1);

    if (webhook && webhook.failureCount >= 9) {
      // Disable webhook after 10 consecutive failures
      await db
        .update(webhooksTable)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(webhooksTable.id, webhookId));

      console.warn(`[Webhook Failure] Auto-disabled webhook: ${webhookId} (10+ failures)`);
    }
  }

  return NextResponse.json({ received: true, deliveryId, status: 'failed' });
}
