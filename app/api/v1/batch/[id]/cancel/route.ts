/**
 * POST /api/v1/batch/:id/cancel - Cancel a batch job
 */

import { NextResponse } from 'next/server';
import { cancelBatch } from '@/lib/batch';
import { NotFoundError, ApiError, withApiMiddleware, ApiRequest } from '@/lib/api';

// =============================================================================
// POST - Cancel Batch
// =============================================================================

async function handleCancelBatch(
  req: ApiRequest,
  context?: { params: Promise<Record<string, string>> }
): Promise<NextResponse> {
  const params = await context?.params;
  const id = params?.id;

  if (!id) {
    throw new NotFoundError('Batch not found');
  }

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
