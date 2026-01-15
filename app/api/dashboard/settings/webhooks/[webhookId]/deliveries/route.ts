import { NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { webhooksTable, webhookDeliveriesTable } from '@/utils/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { withDashboardAuth, DashboardRequest } from '@/lib/api/dashboard-middleware';

/**
 * GET - List webhook deliveries with filtering and pagination
 */
async function handleGet(
  req: DashboardRequest,
  routeContext?: { params: Promise<{ webhookId: string }> }
) {
  const { webhookId } = await routeContext!.params;
  const { context } = req;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const offset = (page - 1) * limit;

  // Verify webhook exists and belongs to org
  const [webhook] = await db
    .select({ orgId: webhooksTable.orgId })
    .from(webhooksTable)
    .where(eq(webhooksTable.id, webhookId))
    .limit(1);

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  if (webhook.orgId !== context.orgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Build conditions
  const conditions = [eq(webhookDeliveriesTable.webhookId, webhookId)];

  if (status && ['pending', 'processing', 'delivered', 'retrying', 'failed'].includes(status)) {
    conditions.push(
      eq(webhookDeliveriesTable.status, status as 'pending' | 'processing' | 'delivered' | 'retrying' | 'failed')
    );
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
    deliveries,
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
