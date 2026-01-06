/**
 * GET/PATCH /api/dashboard/escalations/[id]
 * Get escalation details or resolve/dismiss an escalation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/utils/db/db';
import {
  escalationsTable,
  verificationsTable,
  paradigmResultsTable,
  orgMembersTable,
  usersTable,
} from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/utils/supabase/server';
import {
  getEscalationStatus,
  resolveEscalation,
  dismissEscalation,
  REASON_DISPLAY_MAP,
} from '@/lib/escalation';
import { fireWebhooks } from '@/lib/webhooks/service';
import { logAuditEvent, extractRequestMetadata } from '@/lib/audit';

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

const ResolveEscalationSchema = z.object({
  action: z.enum(['resolve', 'dismiss']),
  humanVerdict: z.enum(['true', 'false', 'uncertain']).optional(),
  resolution: z.string().max(2000).optional(),
});

// =============================================================================
// GET - Fetch single escalation with full details
// =============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const orgMember = await db.query.orgMembersTable.findFirst({
      where: eq(orgMembersTable.userId, user.id),
    });

    if (!orgMember) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Fetch escalation with verification and paradigm results
    const escalation = await db.query.escalationsTable.findFirst({
      where: eq(escalationsTable.id, id),
      with: {
        verification: {
          with: {
            paradigmResults: true,
          },
        },
        resolvedByUser: true,
      },
    });

    if (!escalation) {
      return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
    }

    // Check organization ownership
    if (escalation.verification.orgId !== orgMember.orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Format response with full details
    return NextResponse.json({
      id: escalation.id,
      verificationId: escalation.verificationId,
      reason: escalation.reason,
      reasonDisplay:
        REASON_DISPLAY_MAP[escalation.reason as keyof typeof REASON_DISPLAY_MAP] ||
        escalation.reason,
      details: escalation.details,
      priority: escalation.priority,
      status: getEscalationStatus(escalation.resolvedAt, escalation.humanVerdict),
      deadline: escalation.deadline?.toISOString() || null,
      resolvedAt: escalation.resolvedAt?.toISOString() || null,
      resolvedBy: escalation.resolvedByUser
        ? {
            id: escalation.resolvedByUser.id,
            name: escalation.resolvedByUser.name,
            email: escalation.resolvedByUser.email,
          }
        : null,
      resolution: escalation.resolution,
      humanVerdict: escalation.humanVerdict,
      createdAt: escalation.createdAt.toISOString(),
      verification: {
        id: escalation.verification.id,
        content: escalation.verification.content,
        verdict: escalation.verification.finalVerdict,
        confidence: escalation.verification.confidenceScore
          ? parseFloat(escalation.verification.confidenceScore)
          : null,
        decision: escalation.verification.decision,
        reasoning: escalation.verification.reasoning,
        processingTimeMs: escalation.verification.processingTimeMs,
        costCents: escalation.verification.costCents,
        createdAt: escalation.verification.createdAt.toISOString(),
        completedAt: escalation.verification.completedAt?.toISOString() || null,
        paradigmResults: escalation.verification.paradigmResults.map((pr) => ({
          id: pr.id,
          paradigm: pr.paradigmType,
          weight: pr.weight ? parseFloat(pr.weight) : null,
          provider: pr.provider,
          model: pr.model,
          verdict: pr.verdict,
          confidence: pr.confidence ? parseFloat(pr.confidence) : null,
          reasoning: pr.reasoning,
          processingTimeMs: pr.processingTimeMs,
          error: pr.errorMessage,
        })),
      },
    });
  } catch (error) {
    console.error('Failed to fetch escalation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// PATCH - Resolve or dismiss an escalation
// =============================================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const orgMember = await db.query.orgMembersTable.findFirst({
      where: eq(orgMembersTable.userId, user.id),
    });

    if (!orgMember) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Parse and validate request body
    let body: z.infer<typeof ResolveEscalationSchema>;
    try {
      const rawBody = await req.json();
      body = ResolveEscalationSchema.parse(rawBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.issues.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { action, humanVerdict, resolution } = body;

    // Validate that humanVerdict is provided when resolving
    if (action === 'resolve' && !humanVerdict) {
      return NextResponse.json(
        { error: 'humanVerdict is required when resolving an escalation' },
        { status: 400 }
      );
    }

    // Fetch escalation to verify ownership and status
    const escalation = await db
      .select({
        id: escalationsTable.id,
        verificationId: escalationsTable.verificationId,
        resolvedAt: escalationsTable.resolvedAt,
        orgId: verificationsTable.orgId,
      })
      .from(escalationsTable)
      .innerJoin(
        verificationsTable,
        eq(escalationsTable.verificationId, verificationsTable.id)
      )
      .where(eq(escalationsTable.id, id))
      .limit(1);

    if (escalation.length === 0) {
      return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
    }

    // Check organization ownership
    if (escalation[0].orgId !== orgMember.orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if already resolved
    if (escalation[0].resolvedAt) {
      return NextResponse.json(
        { error: 'Escalation has already been resolved' },
        { status: 409 }
      );
    }

    // Perform the action
    let updated;
    if (action === 'resolve') {
      updated = await resolveEscalation(
        id,
        user.id,
        humanVerdict as 'true' | 'false' | 'uncertain',
        resolution
      );

      // Also update the verification's final verdict with the human decision
      if (humanVerdict) {
        await db
          .update(verificationsTable)
          .set({
            finalVerdict: humanVerdict,
            status: 'completed',
          })
          .where(eq(verificationsTable.id, escalation[0].verificationId));
      }
    } else {
      updated = await dismissEscalation(id, user.id, resolution);

      // Update verification status to completed (dismissed means original verdict stands)
      await db
        .update(verificationsTable)
        .set({
          status: 'completed',
        })
        .where(eq(verificationsTable.id, escalation[0].verificationId));
    }

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update escalation' },
        { status: 500 }
      );
    }

    // Fire escalation.resolved webhook
    fireWebhooks(escalation[0].orgId, 'escalation.resolved', {
      escalationId: id,
      verificationId: escalation[0].verificationId,
      action: action,
      humanVerdict: humanVerdict || null,
      resolution: resolution || null,
      resolvedAt: updated.resolvedAt?.toISOString(),
    });

    // Log audit event
    logAuditEvent({
      orgId: escalation[0].orgId,
      userId: user.id,
      eventType: action === 'resolve' ? 'escalation.resolved' : 'escalation.dismissed',
      description: `Escalation ${action === 'resolve' ? 'resolved' : 'dismissed'}${humanVerdict ? ` with verdict: ${humanVerdict}` : ''}`,
      resourceType: 'escalation',
      resourceId: id,
      changes: {
        after: {
          action,
          humanVerdict: humanVerdict || null,
          resolution: resolution || null,
        },
      },
      metadata: extractRequestMetadata(req),
    });

    return NextResponse.json({
      id: updated.id,
      status: action === 'resolve' ? 'resolved' : 'dismissed',
      resolvedAt: updated.resolvedAt?.toISOString(),
      humanVerdict: updated.humanVerdict,
      resolution: updated.resolution,
    });
  } catch (error) {
    console.error('Failed to update escalation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
