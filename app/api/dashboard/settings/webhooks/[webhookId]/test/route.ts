import { NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { webhooksTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';
import { withDashboardAuth, DashboardRequest } from '@/lib/api/dashboard-middleware';
import { sendTestWebhook } from '@/lib/webhooks/service';
import { extractRouteParam, RouteContext, errorResponse, assertOrgOwnership } from '@/lib/api/validation';

// =============================================================================
// POST - Send test webhook
// =============================================================================

async function handlePost(
  req: DashboardRequest,
  routeContext?: RouteContext<{ webhookId: string }>
) {
  const webhookId = await extractRouteParam(routeContext, 'webhookId');
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

  // Send test webhook
  const result = await sendTestWebhook(webhookId);

  return NextResponse.json({
    success: result.success,
    statusCode: result.statusCode,
    durationMs: result.durationMs,
    error: result.error,
  });
}

export const POST = withDashboardAuth(handlePost, { permission: 'webhooks:update' });
