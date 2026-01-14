import { NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { webhooksTable, webhookDeliveriesTable } from '@/utils/db/schema';
import { eq, desc } from 'drizzle-orm';
import { withDashboardAuth, DashboardRequest } from '@/lib/api';
import { logAuditEvent, extractRequestMetadata } from '@/lib/audit';
import { UpdateWebhookSchema } from '@/lib/constants/webhooks';

type RouteParams = { webhookId: string };

// =============================================================================
// HELPERS
// =============================================================================

async function getWebhookForOrg(webhookId: string, orgId: string) {
  const [webhook] = await db
    .select({
      id: webhooksTable.id,
      url: webhooksTable.url,
      events: webhooksTable.events,
      description: webhooksTable.description,
      isActive: webhooksTable.isActive,
      lastTriggeredAt: webhooksTable.lastTriggeredAt,
      lastStatus: webhooksTable.lastStatus,
      failureCount: webhooksTable.failureCount,
      createdAt: webhooksTable.createdAt,
      orgId: webhooksTable.orgId,
    })
    .from(webhooksTable)
    .where(eq(webhooksTable.id, webhookId))
    .limit(1);

  if (!webhook) return null;
  if (webhook.orgId !== orgId) return null;
  return webhook;
}

// =============================================================================
// GET - Get single webhook with recent deliveries
// =============================================================================

export const GET = withDashboardAuth<RouteParams>(async (req, routeContext) => {
  const { context } = req;
  const { webhookId } = await routeContext!.params;

  const webhook = await getWebhookForOrg(webhookId, context.orgId);
  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  // Get recent deliveries
  const deliveries = await db
    .select({
      id: webhookDeliveriesTable.id,
      event: webhookDeliveriesTable.event,
      status: webhookDeliveriesTable.status,
      responseStatus: webhookDeliveriesTable.responseStatus,
      durationMs: webhookDeliveriesTable.durationMs,
      deliveredAt: webhookDeliveriesTable.deliveredAt,
    })
    .from(webhookDeliveriesTable)
    .where(eq(webhookDeliveriesTable.webhookId, webhookId))
    .orderBy(desc(webhookDeliveriesTable.deliveredAt))
    .limit(10);

  return NextResponse.json({
    webhook: {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      description: webhook.description,
      isActive: webhook.isActive,
      lastTriggeredAt: webhook.lastTriggeredAt,
      lastStatus: webhook.lastStatus,
      failureCount: webhook.failureCount,
      createdAt: webhook.createdAt,
    },
    deliveries,
  });
}, { permission: 'webhooks:view' });

// =============================================================================
// PATCH - Update webhook
// =============================================================================

export const PATCH = withDashboardAuth<RouteParams>(async (req, routeContext) => {
  const { context } = req;
  const { webhookId } = await routeContext!.params;

  // Verify webhook exists and belongs to org
  const [existing] = await db
    .select({ orgId: webhooksTable.orgId })
    .from(webhooksTable)
    .where(eq(webhooksTable.id, webhookId))
    .limit(1);

  if (!existing || existing.orgId !== context.orgId) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = UpdateWebhookSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (parsed.data.url !== undefined) {
    updates.url = parsed.data.url;
  }
  if (parsed.data.events !== undefined) {
    updates.events = parsed.data.events;
  }
  if (parsed.data.description !== undefined) {
    updates.description = parsed.data.description;
  }
  if (parsed.data.isActive !== undefined) {
    updates.isActive = parsed.data.isActive;
    // Reset failure count when re-enabling
    if (parsed.data.isActive) {
      updates.failureCount = 0;
    }
  }

  const [updated] = await db
    .update(webhooksTable)
    .set(updates)
    .where(eq(webhooksTable.id, webhookId))
    .returning({
      id: webhooksTable.id,
      url: webhooksTable.url,
      events: webhooksTable.events,
      description: webhooksTable.description,
      isActive: webhooksTable.isActive,
    });

  // Log audit event
  logAuditEvent({
    orgId: context.orgId,
    userId: context.userId,
    eventType: 'webhook.updated',
    description: `Webhook updated`,
    resourceType: 'webhook',
    resourceId: webhookId,
    changes: { after: parsed.data },
    metadata: extractRequestMetadata(req),
  });

  return NextResponse.json({
    success: true,
    webhook: updated,
  });
}, { permission: 'webhooks:update' });

// =============================================================================
// DELETE - Delete webhook
// =============================================================================

export const DELETE = withDashboardAuth<RouteParams>(async (req, routeContext) => {
  const { context } = req;
  const { webhookId } = await routeContext!.params;

  // Verify webhook exists and belongs to org
  const [existing] = await db
    .select({ orgId: webhooksTable.orgId })
    .from(webhooksTable)
    .where(eq(webhooksTable.id, webhookId))
    .limit(1);

  if (!existing || existing.orgId !== context.orgId) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  await db.delete(webhooksTable).where(eq(webhooksTable.id, webhookId));

  // Log audit event
  logAuditEvent({
    orgId: context.orgId,
    userId: context.userId,
    eventType: 'webhook.deleted',
    description: `Webhook deleted`,
    resourceType: 'webhook',
    resourceId: webhookId,
    metadata: extractRequestMetadata(req),
  });

  return NextResponse.json({ success: true });
}, { permission: 'webhooks:delete' });
