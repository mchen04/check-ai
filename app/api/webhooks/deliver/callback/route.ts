import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { webhookDeliveriesTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';
import { getQStashReceiver } from '@/lib/webhooks/qstash';

/**
 * QStash Success Callback Handler
 *
 * Called by QStash when a webhook delivery succeeds.
 * This is used for additional logging/tracking if needed.
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
      console.error('[Webhook Callback] Signature verification failed:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Parse callback payload
  let callbackData: { body?: string };
  try {
    callbackData = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // The callback body contains the original request body
  let originalPayload: { deliveryId?: string };
  try {
    originalPayload = callbackData.body ? JSON.parse(callbackData.body) : {};
  } catch {
    originalPayload = {};
  }

  const { deliveryId } = originalPayload;

  if (deliveryId) {
    // Ensure delivery is marked as delivered
    await db
      .update(webhookDeliveriesTable)
      .set({
        status: 'delivered',
        deliveredAt: new Date(),
        success: true,
      })
      .where(eq(webhookDeliveriesTable.id, deliveryId));

    console.log(`[Webhook Callback] Success confirmed: ${deliveryId}`);
  }

  return NextResponse.json({ received: true });
}
