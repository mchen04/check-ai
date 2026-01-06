/**
 * GET /api/v1/batch/:id - Get batch status
 */

import { NextResponse } from 'next/server';
import { getBatch } from '@/lib/batch';
import { NotFoundError, withApiMiddleware, ApiRequest } from '@/lib/api';

// =============================================================================
// GET - Get Batch Status
// =============================================================================

async function handleGetBatch(
  req: ApiRequest,
  context?: { params: Promise<Record<string, string>> }
): Promise<NextResponse> {
  const params = await context?.params;
  const id = params?.id;

  if (!id) {
    throw new NotFoundError('Batch not found');
  }

  const { organization } = req;

  const batch = await getBatch(id, organization.id);

  if (!batch) {
    throw new NotFoundError('Batch not found');
  }

  return NextResponse.json(batch);
}

export const GET = withApiMiddleware(handleGetBatch);
