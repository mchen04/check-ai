/**
 * GET /api/dashboard/escalations
 * Fetch escalations for dashboard with pagination and filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { orgMembersTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/utils/supabase/server';
import { REASON_DISPLAY_MAP } from '@/lib/escalation';
import {
  listEscalations,
  getEscalationStats,
  getEscalationStatus,
} from '@/lib/escalation/repository';

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
    const statusFilter = searchParams.get('status') as 'pending' | 'resolved' | 'dismissed' | null;
    const priorityFilter = searchParams.get('priority');

    // Parse priority filter
    let priority: number | undefined;
    if (priorityFilter) {
      const p = parseInt(priorityFilter, 10);
      if (p >= 1 && p <= 3) {
        priority = p;
      }
    }

    // Fetch escalations using repository
    const { escalations: results, hasMore } = await listEscalations({
      orgId: orgMember.orgId,
      status: statusFilter || undefined,
      priority,
      limit,
      offset,
    });

    // Get stats using repository
    const stats = await getEscalationStats(orgMember.orgId);

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
        total: stats.total,
        pending: stats.pending,
        inReview: 0, // Reserved for future use
        resolved: stats.resolved,
        dismissed: stats.dismissed,
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
