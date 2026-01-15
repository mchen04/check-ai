import { NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { webhooksTable, webhookDeliveriesTable } from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';
import { withDashboardAuth, DashboardRequest } from '@/lib/api/dashboard-middleware';
import { retryWebhookDelivery } from '@/lib/webhooks/service';
import { RouteContext, errorResponse, assertOrgOwnership } from '@/lib/api/validation';

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

  // Verify webhook exists and belongs to org
  const [webhook] = await db
    .select({ orgId: webhooksTable.orgId, isActive: webhooksTable.isActive })
    .from(webhooksTable)
    .where(eq(webhooksTable.id, webhookId))
    .limit(1);

  if (!webhook) {
    return errorResponse.notFound('Webhook not found');
  }

  await assertOrgOwnership(webhook.orgId, context.orgId);

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
