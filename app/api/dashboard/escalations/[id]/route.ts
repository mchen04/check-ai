/**
 * GET/PATCH /api/dashboard/escalations/[id]
 * Get escalation details or resolve/dismiss an escalation
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/utils/db/db';
import { escalationsTable, verificationsTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';
import {
  withDashboardAuth,
  DashboardRequest,
  formatDateToISO,
  formatRequiredDateToISO,
  parseDecimal,
  formatParadigmResultExtendedForResponse,
  errorResponse,
  parseAndValidate,
  extractRouteParam,
  assertOrgOwnership,
  RouteContext,
} from '@/lib/api';
import {
  getEscalationStatus,
  resolveEscalation,
  dismissEscalation,
  REASON_DISPLAY_MAP,
  type HumanVerdict,
} from '@/lib/escalation';
import { fireWebhooks } from '@/lib/webhooks';
import { createAuditLogger } from '@/lib/audit';

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

async function handleGet(
  req: DashboardRequest,
  routeContext?: RouteContext
) {
  const id = await extractRouteParam(routeContext);
  const { context } = req;

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
    return errorResponse.notFound('Escalation not found');
  }

  // Check organization ownership
  await assertOrgOwnership(escalation.verification.orgId, context.orgId);

  // Format response with full details using shared formatters
  return NextResponse.json({
    id: escalation.id,
    verificationId: escalation.verificationId,
    reason: escalation.reason,
    reasonDisplay:
      REASON_DISPLAY_MAP[escalation.reason as keyof typeof REASON_DISPLAY_MAP] ||
      escalation.reason,
    details: escalation.details,
    priority: escalation.priority,
    status: getEscalationStatus(escalation.resolvedAt, escalation.humanVerdict as HumanVerdict | null),
    deadline: formatDateToISO(escalation.deadline),
    resolvedAt: formatDateToISO(escalation.resolvedAt),
    resolvedBy: escalation.resolvedByUser
      ? {
          id: escalation.resolvedByUser.id,
          name: escalation.resolvedByUser.name,
          email: escalation.resolvedByUser.email,
        }
      : null,
    resolution: escalation.resolution,
    humanVerdict: escalation.humanVerdict,
    createdAt: formatRequiredDateToISO(escalation.createdAt),
    verification: {
      id: escalation.verification.id,
      content: escalation.verification.content,
      verdict: escalation.verification.finalVerdict,
      confidence: parseDecimal(escalation.verification.confidenceScore),
      decision: escalation.verification.decision,
      reasoning: escalation.verification.reasoning,
      processingTimeMs: escalation.verification.processingTimeMs,
      costCents: escalation.verification.costCents,
      createdAt: formatRequiredDateToISO(escalation.verification.createdAt),
      completedAt: formatDateToISO(escalation.verification.completedAt),
      paradigmResults: escalation.verification.paradigmResults.map(formatParadigmResultExtendedForResponse),
    },
  });
}

export const GET = withDashboardAuth(handleGet);

// =============================================================================
// PATCH - Resolve or dismiss an escalation
// =============================================================================

async function handlePatch(
  req: DashboardRequest,
  routeContext?: RouteContext
) {
  const id = await extractRouteParam(routeContext);
  const { context } = req;

  // Parse and validate request body using shared utility
  const result = await parseAndValidate(req, ResolveEscalationSchema);
  if (!result.success) return result.error;

  const { action, humanVerdict, resolution } = result.data;

  // Validate that humanVerdict is provided when resolving
  if (action === 'resolve' && !humanVerdict) {
    return errorResponse.badRequest('humanVerdict is required when resolving an escalation');
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
    return errorResponse.notFound('Escalation not found');
  }

  // Check organization ownership
  await assertOrgOwnership(escalation[0].orgId, context.orgId);

  // Check if already resolved
  if (escalation[0].resolvedAt) {
    return errorResponse.conflict('Escalation has already been resolved');
  }

  // Perform the action
  let updated;
  if (action === 'resolve') {
    updated = await resolveEscalation(
      id,
      context.userId,
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
    updated = await dismissEscalation(id, context.userId, resolution);

    // Update verification status to completed (dismissed means original verdict stands)
    await db
      .update(verificationsTable)
      .set({
        status: 'completed',
      })
      .where(eq(verificationsTable.id, escalation[0].verificationId));
  }

  if (!updated) {
    return errorResponse.internalError('Failed to update escalation');
  }

  // Fire escalation.resolved webhook
  fireWebhooks(escalation[0].orgId, 'escalation.resolved', {
    escalationId: id,
    verificationId: escalation[0].verificationId,
    action: action,
    humanVerdict: humanVerdict || null,
    resolution: resolution || null,
    resolvedAt: formatDateToISO(updated.resolvedAt),
  });

  // Log audit event
  const audit = createAuditLogger(context, req);
  audit.log({
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
  });

  return NextResponse.json({
    id: updated.id,
    status: action === 'resolve' ? 'resolved' : 'dismissed',
    resolvedAt: formatDateToISO(updated.resolvedAt),
    humanVerdict: updated.humanVerdict,
    resolution: updated.resolution,
  });
}

export const PATCH = withDashboardAuth(handlePatch);
