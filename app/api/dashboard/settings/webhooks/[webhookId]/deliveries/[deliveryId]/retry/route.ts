import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/utils/db/db';
import { webhookDeliveriesTable } from '@/utils/db/schema';
import { withDashboardAuth, DashboardRequest, RouteContext, errorResponse } from '@/lib/api';
import { retryWebhookDelivery, getWebhook } from '@/lib/webhooks';

/**
 * POST - Manually retry a failed webhook delivery
 */
async function handlePost(
  req: DashboardRequest,
  routeContext?: RouteContext<{ webhookId: string; deliveryId: string }>
) {
  const params = await routeContext!.params;
  const { webhookId, deliveryId } = params;
  const { context } = req;

  // Verify webhook exists and belongs to org using repository
  const webhook = await getWebhook(webhookId, context.orgId);
  if (!webhook) {
    return errorResponse.notFound('Webhook not found');
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
    return errorResponse.notFound('Delivery not found');
  }

  // Only allow retrying failed deliveries
  if (delivery.status !== 'failed') {
    return errorResponse.badRequest('Only failed deliveries can be retried');
  }

  // Check if webhook is active
  if (!webhook.isActive) {
    return errorResponse.badRequest('Cannot retry delivery for inactive webhook. Please enable the webhook first.');
  }

  // Retry the delivery
  const newDeliveryId = await retryWebhookDelivery(deliveryId, context.orgId);

  if (!newDeliveryId) {
    return errorResponse.internalError('Failed to queue retry');
  }

  return NextResponse.json({
    success: true,
    newDeliveryId,
    message: 'Delivery queued for retry',
  });
}

export const POST = withDashboardAuth(handlePost, { permission: 'webhooks:update' });
