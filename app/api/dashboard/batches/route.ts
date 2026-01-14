/**
 * GET /api/dashboard/batches - List batch jobs for dashboard
 */

import { NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { batchJobsTable, type BatchStatus } from '@/utils/db/schema';
import { eq, desc, count, and, sql } from 'drizzle-orm';
import { withDashboardRead, type DashboardRequest } from '@/lib/api/dashboard-middleware';
import { parsePagination, createPaginationResponse } from '@/lib/api/types';

async function handler(req: DashboardRequest) {
  const { context } = req;
  const orgId = context.organization.id;

  // Parse pagination params
  const { searchParams } = new URL(req.url);
  const { page, limit, offset } = parsePagination(searchParams);
  const statusFilter = searchParams.get('status');

  // Validate status filter if provided
  const validStatuses: readonly BatchStatus[] = ['pending', 'validating', 'processing', 'completed', 'failed', 'cancelled'];
  const isValidStatus = (s: string): s is BatchStatus => validStatuses.includes(s as BatchStatus);

  if (statusFilter && !isValidStatus(statusFilter)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
  }

  // Build where clause
  const whereConditions = [eq(batchJobsTable.orgId, orgId)];
  if (statusFilter && isValidStatus(statusFilter)) {
    whereConditions.push(eq(batchJobsTable.status, statusFilter));
  }

  // Get batches with pagination
  const batches = await db
    .select({
      id: batchJobsTable.id,
      name: batchJobsTable.name,
      status: batchJobsTable.status,
      totalItems: batchJobsTable.totalItems,
      processedItems: batchJobsTable.processedItems,
      successCount: batchJobsTable.successCount,
      failureCount: batchJobsTable.failureCount,
      totalCostCents: batchJobsTable.totalCostCents,
      inputFormat: batchJobsTable.inputFormat,
      originalFileName: batchJobsTable.originalFileName,
      createdAt: batchJobsTable.createdAt,
      startedAt: batchJobsTable.startedAt,
      completedAt: batchJobsTable.completedAt,
      errorMessage: batchJobsTable.errorMessage,
    })
    .from(batchJobsTable)
    .where(and(...whereConditions))
    .orderBy(desc(batchJobsTable.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count
  const [countResult] = await db
    .select({ count: count() })
    .from(batchJobsTable)
    .where(and(...whereConditions));

  const total = countResult?.count || 0;

  // Calculate stats
  const [stats] = await db
    .select({
      totalBatches: count(),
      processingCount: sql<number>`count(*) filter (where ${batchJobsTable.status} = 'processing')`,
      completedCount: sql<number>`count(*) filter (where ${batchJobsTable.status} = 'completed')`,
      failedCount: sql<number>`count(*) filter (where ${batchJobsTable.status} = 'failed')`,
    })
    .from(batchJobsTable)
    .where(eq(batchJobsTable.orgId, orgId));

  return NextResponse.json({
    batches: batches.map((batch) => ({
      ...batch,
      progress:
        batch.totalItems > 0
          ? Math.round((batch.processedItems / batch.totalItems) * 100)
          : 0,
    })),
    pagination: createPaginationResponse(page, limit, total),
    stats: {
      total: stats?.totalBatches || 0,
      processing: stats?.processingCount || 0,
      completed: stats?.completedCount || 0,
      failed: stats?.failedCount || 0,
    },
  });
}

export const GET = withDashboardRead(handler);
