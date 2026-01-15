/**
 * GET /api/dashboard/verifications
 * Fetch verification history for dashboard
 */

import { NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { verificationsTable } from '@/utils/db/schema';
import { eq, desc } from 'drizzle-orm';
import { withDashboardRead, type DashboardRequest } from '@/lib/api/dashboard-middleware';
import { parsePagination } from '@/lib/api/types';
import { formatVerificationForResponse } from '@/lib/api/formatters';

async function handler(req: DashboardRequest) {
  const { context } = req;

  // Parse query params
  const { searchParams } = new URL(req.url);
  const { page, limit, offset } = parsePagination(searchParams);

  // Fetch verifications
  const verifications = await db
    .select({
      id: verificationsTable.id,
      content: verificationsTable.content,
      status: verificationsTable.status,
      verdict: verificationsTable.finalVerdict,
      confidence: verificationsTable.confidenceScore,
      processingTimeMs: verificationsTable.processingTimeMs,
      costCents: verificationsTable.costCents,
      createdAt: verificationsTable.createdAt,
      completedAt: verificationsTable.completedAt,
    })
    .from(verificationsTable)
    .where(eq(verificationsTable.orgId, context.organization.id))
    .orderBy(desc(verificationsTable.createdAt))
    .limit(limit + 1) // Fetch one extra to check if there's more
    .offset(offset);

  // Check if there are more results
  const hasMore = verifications.length > limit;
  const results = hasMore ? verifications.slice(0, limit) : verifications;

  // Format response using shared formatters
  const formattedResults = results.map((v) =>
    formatVerificationForResponse({
      id: v.id,
      content: v.content,
      status: v.status,
      verdict: v.verdict,
      confidence: v.confidence,
      processingTimeMs: v.processingTimeMs,
      costCents: v.costCents,
      createdAt: v.createdAt,
      completedAt: v.completedAt,
    })
  );

  return NextResponse.json({
    verifications: formattedResults,
    page,
    limit,
    hasMore,
  });
}

export const GET = withDashboardRead(handler);
