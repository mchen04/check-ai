/**
 * GET /api/dashboard/batch/[id]/results - Get batch results (session auth for dashboard)
 */

import { NextResponse } from 'next/server';
import { getBatchResults } from '@/lib/batch';
import { withDashboardAuth, DashboardRequest } from '@/lib/api';
import { extractRouteParam, RouteContext } from '@/lib/api/validation';

// =============================================================================
// GET - Get Batch Results
// =============================================================================

async function handleGetBatchResults(
  req: DashboardRequest,
  context?: RouteContext
): Promise<NextResponse> {
  const id = await extractRouteParam(context);
  const { context: dashContext } = req;
  const { searchParams } = new URL(req.url);

  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const status = searchParams.get('status') || undefined;

  const results = await getBatchResults(id, dashContext.orgId, {
    limit,
    offset,
    status,
  });

  if (!results) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  return NextResponse.json(results);
}

export const GET = withDashboardAuth(handleGetBatchResults, { permission: 'verifications:view' });
