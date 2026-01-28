import { NextResponse } from 'next/server';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@/utils/db/db';
import { webhookDeliveriesTable } from '@/utils/db/schema';
import {
  withDashboardAuth,
  DashboardRequest,
  extractRouteParam,
  RouteContext,
  errorResponse,
  validateEnumParam,
  formatWebhookDeliveryForResponse,
  parsePagination,
} from '@/lib/api';
import { WEBHOOK_DELIVERY_STATUSES } from '@/lib/constants';
import { getWebhook } from '@/lib/webhooks';

/**
 * GET - List webhook deliveries with filtering and pagination
 */
async function handleGet(
  req: DashboardRequest,
  routeContext?: RouteContext<{ webhookId: string }>
) {
  const webhookId = await extractRouteParam(routeContext, 'webhookId');
  const { context } = req;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const { page, limit, offset } = parsePagination(searchParams);

  // Verify webhook exists and belongs to org using repository
  const webhook = await getWebhook(webhookId, context.orgId);
  if (!webhook) {
    return errorResponse.notFound('Webhook not found');
  }

  // Validate and apply status filter using shared helper
  const validatedStatus = validateEnumParam(status, WEBHOOK_DELIVERY_STATUSES);

  // Build conditions
  const conditions = [eq(webhookDeliveriesTable.webhookId, webhookId)];

  if (validatedStatus) {
    conditions.push(eq(webhookDeliveriesTable.status, validatedStatus));
  }

  // Get deliveries
  const deliveries = await db
    .select({
      id: webhookDeliveriesTable.id,
      event: webhookDeliveriesTable.event,
      status: webhookDeliveriesTable.status,
      attemptNumber: webhookDeliveriesTable.attemptNumber,
      maxAttempts: webhookDeliveriesTable.maxAttempts,
      nextRetryAt: webhookDeliveriesTable.nextRetryAt,
      responseStatus: webhookDeliveriesTable.responseStatus,
      responseBody: webhookDeliveriesTable.responseBody,
      lastError: webhookDeliveriesTable.lastError,
      durationMs: webhookDeliveriesTable.durationMs,
      createdAt: webhookDeliveriesTable.createdAt,
      deliveredAt: webhookDeliveriesTable.deliveredAt,
      failedAt: webhookDeliveriesTable.failedAt,
      attemptHistory: webhookDeliveriesTable.attemptHistory,
    })
    .from(webhookDeliveriesTable)
    .where(and(...conditions))
    .orderBy(desc(webhookDeliveriesTable.createdAt))
    .limit(limit)
    .offset(offset);

  // Get counts by status for filtering UI
  const statusCountsResult = await db
    .select({
      status: webhookDeliveriesTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(webhookDeliveriesTable)
    .where(eq(webhookDeliveriesTable.webhookId, webhookId))
    .groupBy(webhookDeliveriesTable.status);

  const statusCounts: Record<string, number> = {
    pending: 0,
    processing: 0,
    delivered: 0,
    retrying: 0,
    failed: 0,
  };
  for (const row of statusCountsResult) {
    if (row.status) {
      statusCounts[row.status] = row.count;
    }
  }

  // Get total count for current filter
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(webhookDeliveriesTable)
    .where(and(...conditions));

  const total = totalResult?.count || 0;

  return NextResponse.json({
    deliveries: deliveries.map(formatWebhookDeliveryForResponse),
    statusCounts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export const GET = withDashboardAuth(handleGet, { permission: 'webhooks:view' });
