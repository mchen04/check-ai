import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { webhooksTable, webhookDeliveriesTable } from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserOrgContext, checkPermission } from '@/lib/rbac/get-user-org';
import { retryWebhookDelivery } from '@/lib/webhooks/service';

/**
 * POST - Manually retry a failed webhook delivery
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ webhookId: string; deliveryId: string }> }
) {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(context, 'webhooks:update');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const { webhookId, deliveryId } = await params;

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
  } catch (error) {
    console.error('Error retrying delivery:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
