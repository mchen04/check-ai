/**
 * GET /api/v1/batch/:id - Get batch status
 */

import { NextResponse } from 'next/server';
import { getBatch } from '@/lib/batch';
import { NotFoundError, withApiMiddleware, ApiRequest, extractRouteParam, RouteContext } from '@/lib/api';

// =============================================================================
// GET - Get Batch Status
// =============================================================================

async function handleGetBatch(
  req: ApiRequest,
  context?: RouteContext
): Promise<NextResponse> {
  const id = await extractRouteParam(context);
  const { organization } = req;

  const batch = await getBatch(id, organization.id);

  if (!batch) {
    throw new NotFoundError('Batch');
  }

  return NextResponse.json(batch);
}

export const GET = withApiMiddleware(handleGetBatch);
