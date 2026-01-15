/**
 * GET /api/v1/verify/[id]
 * Retrieve verification status and results
 */

import { NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { verificationsTable } from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';
import { NotFoundError, withApiMiddleware, ApiRequest } from '@/lib/api';
import { parseDecimal, parseDecimalWithDefault, formatParadigmResultForResponse } from '@/lib/api/formatters';
import { extractRouteParam, RouteContext } from '@/lib/api/validation';

// =============================================================================
// HANDLER
// =============================================================================

async function handleGetVerification(
  req: ApiRequest,
  context?: RouteContext
): Promise<NextResponse> {
  const id = await extractRouteParam(context);
  const { organization } = req;

  // Fetch verification with paradigm results
  const verification = await db.query.verificationsTable.findFirst({
    where: and(eq(verificationsTable.id, id), eq(verificationsTable.orgId, organization.id)),
    with: {
      paradigmResults: true,
    },
  });

  if (!verification) {
    throw new NotFoundError('Verification');
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

export const GET = withApiMiddleware(handleGetVerification);
