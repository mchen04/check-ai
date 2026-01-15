/**
 * POST /api/v1/batch/:id/cancel - Cancel a batch job
 */

import { NextResponse } from 'next/server';
import { cancelBatch } from '@/lib/batch';
import { ApiError, withApiMiddleware, ApiRequest } from '@/lib/api';
import { extractRouteParam, RouteContext } from '@/lib/api/validation';

// =============================================================================
// POST - Cancel Batch
// =============================================================================

async function handleCancelBatch(
  req: ApiRequest,
  context?: RouteContext
): Promise<NextResponse> {
  const id = await extractRouteParam(context);
  const { organization } = req;

  const success = await cancelBatch(id, organization.id);

  if (!success) {
    throw new ApiError(
      'Cannot cancel batch. Batch not found or already completed/cancelled.',
      400,
      'CANNOT_CANCEL'
    );
  }

  return NextResponse.json({
    id,
    status: 'cancelled',
    message: 'Batch cancelled successfully',
  });
}

export const POST = withApiMiddleware(handleCancelBatch);
