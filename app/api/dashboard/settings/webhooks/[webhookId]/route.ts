import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/utils/db/db';
import { webhooksTable, webhookDeliveriesTable } from '@/utils/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getUserOrgContext, checkPermission } from '@/lib/rbac/get-user-org';

// =============================================================================
// GET - Get single webhook with recent deliveries
// =============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(context, 'webhooks:view');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const { webhookId } = await params;

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

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Verify org ownership
    if (webhook.orgId !== context.orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get recent deliveries
    const deliveries = await db
      .select({
        id: webhookDeliveriesTable.id,
        event: webhookDeliveriesTable.event,
        responseStatus: webhookDeliveriesTable.responseStatus,
        success: webhookDeliveriesTable.success,
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
  } catch (error) {
    console.error('Error fetching webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// PATCH - Update webhook
// =============================================================================

const WEBHOOK_EVENTS = [
  'verification.completed',
  'verification.escalated',
  'escalation.resolved',
  'usage.limit.warning',
  'usage.limit.reached',
] as const;

const UpdateWebhookSchema = z.object({
  url: z.string().url('Invalid URL').optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1).optional(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
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
    const [existing] = await db
      .select({ orgId: webhooksTable.orgId })
      .from(webhooksTable)
      .where(eq(webhooksTable.id, webhookId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    if (existing.orgId !== context.orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    return NextResponse.json({
      success: true,
      webhook: updated,
    });
  } catch (error) {
    console.error('Error updating webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// DELETE - Delete webhook
// =============================================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(context, 'webhooks:delete');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const { webhookId } = await params;

    // Verify webhook exists and belongs to org
    const [existing] = await db
      .select({ orgId: webhooksTable.orgId })
      .from(webhooksTable)
      .where(eq(webhooksTable.id, webhookId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    if (existing.orgId !== context.orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.delete(webhooksTable).where(eq(webhooksTable.id, webhookId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
