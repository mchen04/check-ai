/**
 * GET /api/dashboard/batches - List batch jobs for dashboard
 */

import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/utils/db/db';
import { batchJobsTable, orgMembersTable } from '@/utils/db/schema';
import { eq, desc, count, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
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
      with: {
        organization: true,
      },
    });

    if (!orgMember?.organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const orgId = orgMember.organization.id;

    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = (page - 1) * limit;
    const statusFilter = searchParams.get('status');

    // Validate status filter if provided
    const validStatuses = ['pending', 'validating', 'processing', 'completed', 'failed', 'cancelled'] as const;
    if (statusFilter && !validStatuses.includes(statusFilter as typeof validStatuses[number])) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
    }

    // Build where clause
    const whereConditions = [eq(batchJobsTable.orgId, orgId)];
    if (statusFilter) {
      whereConditions.push(eq(batchJobsTable.status, statusFilter as any));
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
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + batches.length < total,
      },
      stats: {
        total: stats?.totalBatches || 0,
        processing: stats?.processingCount || 0,
        completed: stats?.completedCount || 0,
        failed: stats?.failedCount || 0,
      },
    });
  } catch (error) {
    console.error('[Dashboard Batches] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
