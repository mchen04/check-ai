import { NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { webhooksTable, webhookDeliveriesTable } from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';
import { withDashboardAuth, DashboardRequest } from '@/lib/api/dashboard-middleware';
import { retryWebhookDelivery } from '@/lib/webhooks/service';

/**
 * POST - Manually retry a failed webhook delivery
 */
async function handlePost(
  req: DashboardRequest,
  routeContext?: { params: Promise<{ webhookId: string; deliveryId: string }> }
) {
  const { webhookId, deliveryId } = await routeContext!.params;
  const { context } = req;

  // Verify webhook exists and belongs to org
  const [webhook] = await db
    .select({ orgId: webhooksTable.orgId, isActive: webhooksTable.isActive })
    .from(webhooksTable)
    .where(eq(webhooksTable.id, webhookId))
    .limit(1);

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  if (webhook.orgId !== context.orgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify delivery exists and belongs to this webhook
  const [delivery] = await db
    .select({
      id: webhookDeliveriesTable.id,
      status: webhookDeliveriesTable.status,
      webhookId: webhookDeliveriesTable.webhookId,
    })
    .from(webhookDeliveriesTable)
    .where(
      and(
        eq(webhookDeliveriesTable.id, deliveryId),
        eq(webhookDeliveriesTable.webhookId, webhookId)
      )
    )
    .limit(1);

  if (!delivery) {
    return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
  }

  // Only allow retrying failed deliveries
  if (delivery.status !== 'failed') {
    return NextResponse.json(
      { error: 'Only failed deliveries can be retried' },
      { status: 400 }
    );
  }

  // Check if webhook is active
  if (!webhook.isActive) {
    return NextResponse.json(
      { error: 'Cannot retry delivery for inactive webhook. Please enable the webhook first.' },
      { status: 400 }
    );
  }

  // Retry the delivery
  const newDeliveryId = await retryWebhookDelivery(deliveryId, context.orgId);

  if (!newDeliveryId) {
    return NextResponse.json(
      { error: 'Failed to queue retry' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    newDeliveryId,
    message: 'Delivery queued for retry',
  });
}

export const POST = withDashboardAuth(handlePost, { permission: 'webhooks:update' });
