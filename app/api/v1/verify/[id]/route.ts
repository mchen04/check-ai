/**
 * GET /api/v1/verify/[id]
 * Retrieve verification status and results
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { verificationsTable } from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';
import {
    ApiError,
    NotFoundError,
    withApiMiddleware,
    ApiRequest,
} from '@/lib/api';

// =============================================================================
// HANDLER
// =============================================================================

async function handleGetVerification(
    req: ApiRequest,
    context?: { params: Promise<Record<string, string>> }
): Promise<NextResponse> {
    const { id } = await context!.params;
    const { organization } = req;

    // Fetch verification with paradigm results
    const verification = await db.query.verificationsTable.findFirst({
        where: and(
            eq(verificationsTable.id, id),
            eq(verificationsTable.orgId, organization.id)
        ),
        with: {
            paradigmResults: true,
        },
    });

    if (!verification) {
        throw new NotFoundError('Verification not found');
    }

    // Format response
    const response = {
        id: verification.id,
        status: verification.status,
        content: verification.content,
        context: verification.context,
        methodsConfig: verification.methodsConfig,
        verdict: verification.finalVerdict,
        confidence: verification.confidenceScore
            ? parseFloat(verification.confidenceScore)
            : null,
        decision: getDecision(verification.status, verification.confidenceScore),
        paradigmResults: verification.paradigmResults.map((pr) => ({
            paradigm: pr.paradigmType,
            provider: pr.provider,
            model: pr.model,
            verdict: pr.verdict,
            confidence: pr.confidence ? parseFloat(pr.confidence) : null,
            reasoning: pr.reasoning,
            processingTimeMs: pr.processingTimeMs,
            error: pr.errorMessage,
            createdAt: pr.createdAt,
        })),
        processingTimeMs: verification.processingTimeMs,
        costCents: verification.costCents ?? 0,
        createdAt: verification.createdAt,
        completedAt: verification.completedAt,
    };

    return NextResponse.json(response, { status: 200 });
}

function getDecision(
    status: string,
    confidence: string | null
): string | null {
    if (status !== 'completed') return null;

    const conf = confidence ? parseFloat(confidence) : 0;

    if (conf >= 0.95) return 'accept';
    if (conf >= 0.70) return 'refine';
    if (conf >= 0.50) return 'escalate';
    return 'reject';
}

// =============================================================================
// EXPORTS
// =============================================================================

export const GET = withApiMiddleware(handleGetVerification);
