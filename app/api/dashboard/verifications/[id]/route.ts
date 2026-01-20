/**
 * GET /api/dashboard/verifications/[id]
 * Retrieve verification details (session auth for dashboard)
 */

import { NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { verificationsTable } from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  withDashboardAuth,
  DashboardRequest,
  parseDecimal,
  parseDecimalWithDefault,
  formatParadigmResultForResponse,
  extractRouteParam,
  RouteContext,
} from '@/lib/api';

// =============================================================================
// HANDLER
// =============================================================================

async function handleGetVerification(
  req: DashboardRequest,
  context?: RouteContext
): Promise<NextResponse> {
  const id = await extractRouteParam(context);
  const { context: dashContext } = req;

  // Fetch verification with paradigm results
  const verification = await db.query.verificationsTable.findFirst({
    where: and(eq(verificationsTable.id, id), eq(verificationsTable.orgId, dashContext.orgId)),
    with: {
      paradigmResults: true,
    },
  });

  if (!verification) {
    return NextResponse.json({ error: 'Verification not found' }, { status: 404 });
  }

  // Format response
  const response = {
    id: verification.id,
    status: verification.status,
    content: verification.content,
    context: verification.context,
    methodsConfig: verification.methodsConfig,
    verdict: verification.finalVerdict,
    confidence: parseDecimal(verification.confidenceScore),
    decision: getDecision(verification.status, verification.confidenceScore),
    reasoning: verification.reasoning,
    paradigmResults: verification.paradigmResults.map(formatParadigmResultForResponse),
    processingTimeMs: verification.processingTimeMs,
    costCents: verification.costCents ?? 0,
    createdAt: verification.createdAt,
    completedAt: verification.completedAt,
  };

  return NextResponse.json(response, { status: 200 });
}

function getDecision(status: string, confidence: string | null): string | null {
  if (status !== 'completed') return null;

  const conf = parseDecimalWithDefault(confidence, 0);

  if (conf >= 0.95) return 'accept';
  if (conf >= 0.7) return 'refine';
  if (conf >= 0.5) return 'escalate';
  return 'reject';
}

// =============================================================================
// EXPORTS
// =============================================================================

export const GET = withDashboardAuth(handleGetVerification, { permission: 'verifications:view' });
