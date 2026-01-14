import { NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { webhooksTable } from '@/utils/db/schema';
import { eq, desc } from 'drizzle-orm';
import { withDashboardAuth, DashboardRequest } from '@/lib/api';
import { generateSigningSecret } from '@/lib/webhooks/service';
import { createAuditLogger } from '@/lib/audit';
import { CreateWebhookSchema } from '@/lib/constants/webhooks';

// =============================================================================
// GET - List all webhooks for organization
// =============================================================================

export const GET = withDashboardAuth(async (req: DashboardRequest) => {
  const { context } = req;

  const webhooks = await db
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
    })
    .from(webhooksTable)
    .where(eq(webhooksTable.orgId, context.orgId))
    .orderBy(desc(webhooksTable.createdAt));

  return NextResponse.json({
    webhooks,
    canEdit: context.role === 'owner' || context.role === 'admin',
  });
}, { permission: 'webhooks:view' });

// =============================================================================
// POST - Create new webhook
// =============================================================================

export const POST = withDashboardAuth(async (req: DashboardRequest) => {
  const { context } = req;
  const audit = createAuditLogger(context, req);

  const body = await req.json();
  const parsed = CreateWebhookSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { url, events, description } = parsed.data;

  // Generate signing secret
  const signingSecret = generateSigningSecret();

  const [webhook] = await db
    .insert(webhooksTable)
    .values({
      orgId: context.orgId,
      url,
      events,
      description: description || null,
      signingSecret,
    })
    .returning({
      id: webhooksTable.id,
      url: webhooksTable.url,
      events: webhooksTable.events,
      description: webhooksTable.description,
      isActive: webhooksTable.isActive,
      createdAt: webhooksTable.createdAt,
    });

  audit.log({
    eventType: 'webhook.created',
    description: `Webhook created for ${url}`,
    resourceType: 'webhook',
    resourceId: webhook.id,
    changes: { after: { url, events, description } },
  });

  return NextResponse.json({
    success: true,
    webhook,
    signingSecret, // Only returned on creation!
  });
}, { permission: 'webhooks:create' });
