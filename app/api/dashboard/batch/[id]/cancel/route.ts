/**
 * POST /api/dashboard/batch/[id]/cancel - Cancel a batch job (session auth for dashboard)
 */

import { NextResponse } from 'next/server';
import { cancelBatch } from '@/lib/batch';
import { withDashboardAuth, DashboardRequest } from '@/lib/api';
import { extractRouteParam, RouteContext } from '@/lib/api/validation';

// =============================================================================
// POST - Cancel Batch
// =============================================================================

async function handleCancelBatch(
  req: DashboardRequest,
  context?: RouteContext
): Promise<NextResponse> {
  const id = await extractRouteParam(context);
  const { context: dashContext } = req;

  const success = await cancelBatch(id, dashContext.orgId);

  if (!success) {
    return NextResponse.json(
      { error: 'Cannot cancel batch. Batch not found or already completed/cancelled.' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    id,
    status: 'cancelled',
    message: 'Batch cancelled successfully',
  });
}

export const POST = withDashboardAuth(handleCancelBatch, { permission: 'verifications:create' });
