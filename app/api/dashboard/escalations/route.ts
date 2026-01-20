/**
 * GET /api/dashboard/escalations
 * Fetch escalations for dashboard with pagination and filtering
 */

import { NextResponse } from 'next/server';
import {
  REASON_DISPLAY_MAP,
  listEscalations,
  getEscalationStats,
  getEscalationStatus,
} from '@/lib/escalation';
import {
  withDashboardRead,
  type DashboardRequest,
  parsePagination,
  formatDateToISO,
  formatRequiredDateToISO,
  parseDecimal,
  truncateString,
} from '@/lib/api';

async function handler(req: DashboardRequest) {
  const { context } = req;

  // Parse query params
  const { searchParams } = new URL(req.url);
  const { page, limit, offset } = parsePagination(searchParams);
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
    orgId: context.organization.id,
    status: statusFilter || undefined,
    priority,
    limit,
    offset,
  });

  // Get stats using repository
  const stats = await getEscalationStats(context.organization.id);

  // Format response using shared formatters
  const formattedResults = results.map((e) => ({
    id: e.id,
    verificationId: e.verificationId,
    reason: e.reason,
    reasonDisplay: REASON_DISPLAY_MAP[e.reason as keyof typeof REASON_DISPLAY_MAP] || e.reason,
    details: e.details,
    priority: e.priority,
    status: getEscalationStatus(e.resolvedAt, e.humanVerdict),
    deadline: formatDateToISO(e.deadline),
    resolvedAt: formatDateToISO(e.resolvedAt),
    resolution: e.resolution,
    humanVerdict: e.humanVerdict,
    createdAt: formatRequiredDateToISO(e.createdAt),
    verification: {
      id: e.verificationId,
      content: truncateString(e.verificationContent, 200),
      verdict: e.verificationVerdict,
      confidence: parseDecimal(e.verificationConfidence),
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
    pagination: {
      page,
      limit,
      hasMore,
    },
  });
}

export const GET = withDashboardRead(handler);
