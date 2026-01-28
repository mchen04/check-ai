/**
 * GET /api/dashboard/logs
 * Fetch API usage logs (LLM provider calls) for dashboard
 */

import { NextResponse } from 'next/server';
import { eq, desc, and, gte, lte, sql, type SQL } from 'drizzle-orm';
import { db } from '@/utils/db/db';
import { usageTable, verificationsTable } from '@/utils/db/schema';
import {
  withDashboardRead,
  type DashboardRequest,
  parsePagination,
  createPaginationResponse,
} from '@/lib/api';

async function handler(req: DashboardRequest) {
  const { context } = req;

  // Parse query params
  const { searchParams } = new URL(req.url);
  const { page, limit, offset } = parsePagination(searchParams);

  // Parse filter params
  const provider = searchParams.get('provider');
  const model = searchParams.get('model');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // Build filter conditions
  const conditions: SQL[] = [eq(usageTable.orgId, context.organization.id)];

  if (provider) {
    conditions.push(eq(usageTable.provider, provider));
  }

  if (model) {
    conditions.push(eq(usageTable.model, model));
  }

  if (startDate) {
    conditions.push(gte(usageTable.createdAt, new Date(startDate)));
  }

  if (endDate) {
    const endDateTime = new Date(endDate);
    endDateTime.setDate(endDateTime.getDate() + 1);
    conditions.push(lte(usageTable.createdAt, endDateTime));
  }

  const whereClause = and(...conditions);

  // Get total count and logs in parallel
  const [countResult, logs, providersResult] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(usageTable)
      .where(whereClause),
    db
      .select({
        id: usageTable.id,
        verificationId: usageTable.verificationId,
        provider: usageTable.provider,
        model: usageTable.model,
        inputTokens: usageTable.inputTokens,
        outputTokens: usageTable.outputTokens,
        costCents: usageTable.costCents,
        createdAt: usageTable.createdAt,
      })
      .from(usageTable)
      .where(whereClause)
      .orderBy(desc(usageTable.createdAt))
      .limit(limit)
      .offset(offset),
    // Get unique providers for filter dropdown
    db
      .selectDistinct({ provider: usageTable.provider })
      .from(usageTable)
      .where(eq(usageTable.orgId, context.organization.id)),
  ]);

  const total = countResult[0]?.count ?? 0;

  // Format response
  const formattedLogs = logs.map((log) => ({
    id: log.id,
    verificationId: log.verificationId,
    provider: log.provider,
    model: log.model,
    inputTokens: log.inputTokens,
    outputTokens: log.outputTokens,
    totalTokens: log.inputTokens + log.outputTokens,
    costCents: log.costCents,
    createdAt: log.createdAt.toISOString(),
  }));

  return NextResponse.json({
    logs: formattedLogs,
    pagination: createPaginationResponse(page, limit, total),
    providers: providersResult.map((p) => p.provider),
  });
}

export const GET = withDashboardRead(handler, { permission: 'usage:view' });
