import { NextResponse } from 'next/server';
import { withDashboardAuth, DashboardRequest, extractRouteParam, RouteContext, errorResponse } from '@/lib/api';
import { sendTestWebhook, getWebhook } from '@/lib/webhooks';

// =============================================================================
// POST - Send test webhook
// =============================================================================

async function handlePost(
  req: DashboardRequest,
  routeContext?: RouteContext<{ webhookId: string }>
) {
  const webhookId = await extractRouteParam(routeContext, 'webhookId');
  const { context } = req;

  // Verify webhook exists and belongs to org using repository
  const webhook = await getWebhook(webhookId, context.orgId);
  if (!webhook) {
    return errorResponse.notFound('Webhook not found');
  }

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
