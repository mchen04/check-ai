import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { webhooksTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';
import { getUserOrgContext, checkPermission } from '@/lib/rbac/get-user-org';
import { sendTestWebhook } from '@/lib/webhooks/service';

// =============================================================================
// POST - Send test webhook
// =============================================================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> }
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

    const { webhookId } = await params;

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

    // Send test webhook
    const result = await sendTestWebhook(webhookId);

    return NextResponse.json({
      success: result.success,
      statusCode: result.statusCode,
      durationMs: result.durationMs,
      error: result.error,
    });
  } catch (error) {
    console.error('Error sending test webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
