/**
 * GET /api/dashboard/batch/[id] - Get batch status (session auth for dashboard)
 */

import { NextResponse } from 'next/server';
import { getBatch } from '@/lib/batch';
import { withDashboardAuth, DashboardRequest, extractRouteParam, RouteContext } from '@/lib/api';

// =============================================================================
// GET - Get Batch Status
// =============================================================================

async function handleGetBatch(
  req: DashboardRequest,
  context?: RouteContext
): Promise<NextResponse> {
  const id = await extractRouteParam(context);
  const { context: dashContext } = req;

  const batch = await getBatch(id, dashContext.orgId);

  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  return NextResponse.json(batch);
}

export const GET = withDashboardAuth(handleGetBatch, { permission: 'verifications:view' });
