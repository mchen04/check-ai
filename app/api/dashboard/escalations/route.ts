/**
 * GET /api/dashboard/escalations
 * Fetch escalations for dashboard with pagination and filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import {
  escalationsTable,
  verificationsTable,
  orgMembersTable,
} from '@/utils/db/schema';
import { eq, desc, and, isNull, isNotNull, sql } from 'drizzle-orm';
import { createClient } from '@/utils/supabase/server';
import { getEscalationStatus, REASON_DISPLAY_MAP } from '@/lib/escalation';

export async function GET(req: NextRequest) {
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

    if (!orgMember) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = (page - 1) * limit;
    const statusFilter = searchParams.get('status'); // 'pending' | 'resolved' | 'dismissed'
    const priorityFilter = searchParams.get('priority'); // '1' | '2' | '3'

    // Build base query conditions
    const baseCondition = eq(verificationsTable.orgId, orgMember.orgId);

    // Fetch escalations with verification data
    let query = db
      .select({
        id: escalationsTable.id,
        verificationId: escalationsTable.verificationId,
        reason: escalationsTable.reason,
        details: escalationsTable.details,
        priority: escalationsTable.priority,
        deadline: escalationsTable.deadline,
        resolvedAt: escalationsTable.resolvedAt,
        resolvedBy: escalationsTable.resolvedBy,
        resolution: escalationsTable.resolution,
        humanVerdict: escalationsTable.humanVerdict,
        createdAt: escalationsTable.createdAt,
        // Verification fields
        verificationContent: verificationsTable.content,
        verificationVerdict: verificationsTable.finalVerdict,
        verificationConfidence: verificationsTable.confidenceScore,
      })
      .from(escalationsTable)
      .innerJoin(
        verificationsTable,
        eq(escalationsTable.verificationId, verificationsTable.id)
      )
      .where(baseCondition)
      .$dynamic();

    // Apply status filter
    if (statusFilter === 'pending') {
      query = query.where(and(baseCondition, isNull(escalationsTable.resolvedAt)));
    } else if (statusFilter === 'resolved') {
      query = query.where(
        and(
          baseCondition,
          isNotNull(escalationsTable.resolvedAt),
          isNotNull(escalationsTable.humanVerdict)
        )
      );
    } else if (statusFilter === 'dismissed') {
      query = query.where(
        and(
          baseCondition,
          isNotNull(escalationsTable.resolvedAt),
          isNull(escalationsTable.humanVerdict)
        )
      );
    }

    // Apply priority filter
    if (priorityFilter) {
      const priority = parseInt(priorityFilter, 10);
      if (priority >= 1 && priority <= 3) {
        query = query.where(
          and(baseCondition, eq(escalationsTable.priority, priority))
        );
      }
    }

    // Execute query with pagination
    const escalations = await query
      .orderBy(desc(escalationsTable.priority), desc(escalationsTable.createdAt))
      .limit(limit + 1)
      .offset(offset);

    // Check if there are more results
    const hasMore = escalations.length > limit;
    const results = hasMore ? escalations.slice(0, limit) : escalations;

    // Calculate stats (separate query for accuracy)
    const statsQuery = await db
      .select({
        total: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where ${escalationsTable.resolvedAt} is null)`,
        resolved: sql<number>`count(*) filter (where ${escalationsTable.resolvedAt} is not null and ${escalationsTable.humanVerdict} is not null)`,
        dismissed: sql<number>`count(*) filter (where ${escalationsTable.resolvedAt} is not null and ${escalationsTable.humanVerdict} is null)`,
      })
      .from(escalationsTable)
      .innerJoin(
        verificationsTable,
        eq(escalationsTable.verificationId, verificationsTable.id)
      )
      .where(eq(verificationsTable.orgId, orgMember.orgId));

    const stats = statsQuery[0] || { total: 0, pending: 0, resolved: 0, dismissed: 0 };

    // Format response
    const formattedResults = results.map((e) => ({
      id: e.id,
      verificationId: e.verificationId,
      reason: e.reason,
      reasonDisplay: REASON_DISPLAY_MAP[e.reason as keyof typeof REASON_DISPLAY_MAP] || e.reason,
      details: e.details,
      priority: e.priority,
      status: getEscalationStatus(e.resolvedAt, e.humanVerdict),
      deadline: e.deadline?.toISOString() || null,
      resolvedAt: e.resolvedAt?.toISOString() || null,
      resolution: e.resolution,
      humanVerdict: e.humanVerdict,
      createdAt: e.createdAt.toISOString(),
      verification: {
        id: e.verificationId,
        content: e.verificationContent?.slice(0, 200) || '', // Truncate for list view
        verdict: e.verificationVerdict,
        confidence: e.verificationConfidence
          ? parseFloat(e.verificationConfidence)
          : null,
      },
    }));

    return NextResponse.json({
      escalations: formattedResults,
      stats: {
        total: Number(stats.total),
        pending: Number(stats.pending),
        inReview: 0, // Reserved for future use
        resolved: Number(stats.resolved),
        dismissed: Number(stats.dismissed),
      },
      page,
      limit,
      hasMore,
    });
  } catch (error) {
    console.error('Failed to fetch escalations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
