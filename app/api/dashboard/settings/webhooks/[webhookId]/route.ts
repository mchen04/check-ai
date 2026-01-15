import { NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { webhooksTable, webhookDeliveriesTable } from '@/utils/db/schema';
import { eq, desc } from 'drizzle-orm';
import { withDashboardAuth } from '@/lib/api';
import { createAuditLogger } from '@/lib/audit';
import { UpdateWebhookSchema } from '@/lib/constants/webhooks';
import { extractRouteParam, RouteContext, parseAndValidate, errorResponse, assertOrgOwnership } from '@/lib/api/validation';
import { formatDateToISO, formatRequiredDateToISO } from '@/lib/api/formatters';

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
  const webhookId = await extractRouteParam(routeContext as RouteContext<RouteParams>, 'webhookId');

  const webhook = await getWebhookForOrg(webhookId, context.orgId);
  if (!webhook) {
    return errorResponse.notFound('Webhook not found');
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
      lastTriggeredAt: formatDateToISO(webhook.lastTriggeredAt),
      lastStatus: webhook.lastStatus,
      failureCount: webhook.failureCount,
      createdAt: formatRequiredDateToISO(webhook.createdAt),
    },
    deliveries: deliveries.map((d) => ({
      ...d,
      deliveredAt: formatDateToISO(d.deliveredAt),
    })),
  });
}, { permission: 'webhooks:view' });

// =============================================================================
// PATCH - Update webhook
// =============================================================================

export const PATCH = withDashboardAuth<RouteParams>(async (req, routeContext) => {
  const { context } = req;
  const audit = createAuditLogger(context, req);
  const webhookId = await extractRouteParam(routeContext as RouteContext<RouteParams>, 'webhookId');

  // Verify webhook exists and belongs to org
  const [existing] = await db
    .select({ orgId: webhooksTable.orgId })
    .from(webhooksTable)
    .where(eq(webhooksTable.id, webhookId))
    .limit(1);

  if (!existing) {
    return errorResponse.notFound('Webhook not found');
  }
  await assertOrgOwnership(existing.orgId, context.orgId);

  // Parse and validate request body
  const result = await parseAndValidate(req, UpdateWebhookSchema);
  if (!result.success) return result.error;
  const parsed = result;

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

  audit.log({
    eventType: 'webhook.updated',
    description: `Webhook updated`,
    resourceType: 'webhook',
    resourceId: webhookId,
    changes: { after: parsed.data },
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
  const audit = createAuditLogger(context, req);
  const webhookId = await extractRouteParam(routeContext as RouteContext<RouteParams>, 'webhookId');

  // Verify webhook exists and belongs to org
  const [existing] = await db
    .select({ orgId: webhooksTable.orgId })
    .from(webhooksTable)
    .where(eq(webhooksTable.id, webhookId))
    .limit(1);

  if (!existing) {
    return errorResponse.notFound('Webhook not found');
  }
  await assertOrgOwnership(existing.orgId, context.orgId);

  await db.delete(webhooksTable).where(eq(webhooksTable.id, webhookId));

  audit.log({
    eventType: 'webhook.deleted',
    description: `Webhook deleted`,
    resourceType: 'webhook',
    resourceId: webhookId,
  });

  return NextResponse.json({ success: true });
}, { permission: 'webhooks:delete' });
