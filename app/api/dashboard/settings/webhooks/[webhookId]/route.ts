import { NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { webhooksTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';
import { withDashboardAuth } from '@/lib/api';
import { createAuditLogger } from '@/lib/audit';
import { UpdateWebhookSchema } from '@/lib/constants/webhooks';
import { extractRouteParam, RouteContext, parseAndValidate, errorResponse, successResponse } from '@/lib/api/validation';
import { formatDateToISO, formatWebhookForResponse } from '@/lib/api/formatters';
import { getWebhook, getWebhookDeliveries, updateWebhook, deleteWebhook } from '@/lib/webhooks/repository';

type RouteParams = { webhookId: string };

// =============================================================================
// GET - Get single webhook with recent deliveries
// =============================================================================

export const GET = withDashboardAuth<RouteParams>(async (req, routeContext) => {
  const { context } = req;
  const webhookId = await extractRouteParam(routeContext as RouteContext<RouteParams>, 'webhookId');

  const webhook = await getWebhook(webhookId, context.orgId);
  if (!webhook) {
    return errorResponse.notFound('Webhook not found');
  }

  // Get recent deliveries using repository function
  const deliveries = await getWebhookDeliveries(webhookId, 10);

  return NextResponse.json({
    webhook: formatWebhookForResponse(webhook),
    deliveries: deliveries.map((d) => ({
      id: d.id,
      event: d.event,
      status: d.status,
      responseStatus: d.responseStatus,
      durationMs: d.durationMs,
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

  // Verify webhook exists and belongs to org using repository
  const existing = await getWebhook(webhookId, context.orgId);
  if (!existing) {
    return errorResponse.notFound('Webhook not found');
  }

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

  // Use repository function which handles org ownership check
  const deleted = await deleteWebhook(webhookId, context.orgId);
  if (!deleted) {
    return errorResponse.notFound('Webhook not found');
  }

  audit.log({
    eventType: 'webhook.deleted',
    description: `Webhook deleted`,
    resourceType: 'webhook',
    resourceId: webhookId,
  });

  return successResponse.ok();
}, { permission: 'webhooks:delete' });
