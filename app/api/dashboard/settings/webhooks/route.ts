import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/utils/db/db';
import { webhooksTable } from '@/utils/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getUserOrgContext, checkPermission } from '@/lib/rbac/get-user-org';
import { generateSigningSecret } from '@/lib/webhooks/service';
import { logAuditEvent, extractRequestMetadata } from '@/lib/audit';

// =============================================================================
// GET - List all webhooks for organization
// =============================================================================

export async function GET() {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(context, 'webhooks:view');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

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
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// POST - Create new webhook
// =============================================================================

const WEBHOOK_EVENTS = [
  'verification.completed',
  'verification.escalated',
  'escalation.resolved',
  'usage.limit.warning',
  'usage.limit.reached',
] as const;

const CreateWebhookSchema = z.object({
  url: z.string().url('Invalid URL'),
  events: z
    .array(z.enum(WEBHOOK_EVENTS))
    .min(1, 'At least one event is required'),
  description: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(context, 'webhooks:create');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

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

    // Log audit event
    logAuditEvent({
      orgId: context.orgId,
      userId: context.userId,
      eventType: 'webhook.created',
      description: `Webhook created for ${url}`,
      resourceType: 'webhook',
      resourceId: webhook.id,
      changes: { after: { url, events, description } },
      metadata: extractRequestMetadata(req),
    });

    return NextResponse.json({
      success: true,
      webhook,
      signingSecret, // Only returned on creation!
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
