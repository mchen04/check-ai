/**
 * GET /api/dashboard/verifications
 * Fetch verification history for dashboard with filtering and proper pagination
 */

import { NextResponse } from 'next/server';
import { eq, desc, and, ilike, gte, lte, sql, type SQL } from 'drizzle-orm';
import { db } from '@/utils/db/db';
import { verificationsTable } from '@/utils/db/schema';
import {
  withDashboardRead,
  type DashboardRequest,
  parsePagination,
  createPaginationResponse,
  formatVerificationForResponse,
  validateEnumParam,
  type VerificationStatus,
} from '@/lib/api';

const VERIFICATION_STATUSES = ['pending', 'processing', 'completed', 'failed', 'escalated'] as const;

async function handler(req: DashboardRequest) {
  const { context } = req;

  // Parse query params
  const { searchParams } = new URL(req.url);
  const { page, limit, offset } = parsePagination(searchParams);

  // Parse filter params
  const verdict = searchParams.get('verdict'); // 'true', 'false', 'uncertain'
  const statusParam = searchParams.get('status'); // 'pending', 'processing', 'completed', 'failed'
  const search = searchParams.get('search'); // Search in content
  const startDate = searchParams.get('startDate'); // ISO date string
  const endDate = searchParams.get('endDate'); // ISO date string

  // Validate status enum
  const status = validateEnumParam(statusParam, VERIFICATION_STATUSES);

  // Build filter conditions
  const conditions: SQL[] = [eq(verificationsTable.orgId, context.organization.id)];

  if (verdict) {
    conditions.push(eq(verificationsTable.finalVerdict, verdict));
  }

  if (status) {
    conditions.push(eq(verificationsTable.status, status));
  }

  if (search) {
    conditions.push(ilike(verificationsTable.content, `%${search}%`));
  }

  if (startDate) {
    conditions.push(gte(verificationsTable.createdAt, new Date(startDate)));
  }

  if (endDate) {
    // Add one day to include the entire end date
    const endDateTime = new Date(endDate);
    endDateTime.setDate(endDateTime.getDate() + 1);
    conditions.push(lte(verificationsTable.createdAt, endDateTime));
  }

  const whereClause = and(...conditions);

  // Get total count for pagination (run in parallel with data fetch)
  const [countResult, verifications] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(verificationsTable)
      .where(whereClause),
    db
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
      .where(whereClause)
      .orderBy(desc(verificationsTable.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = countResult[0]?.count ?? 0;

  // Format response using shared formatters
  const formattedResults = verifications.map((v) =>
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
    pagination: createPaginationResponse(page, limit, total),
  });
}

export const GET = withDashboardRead(handler, { permission: 'verifications:view' });
