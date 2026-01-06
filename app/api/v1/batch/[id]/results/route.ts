/**
 * GET /api/v1/batch/:id/results - Get batch results
 */

import { NextResponse } from 'next/server';
import { getBatchResults } from '@/lib/batch';
import { NotFoundError, withApiMiddleware, ApiRequest } from '@/lib/api';

// =============================================================================
// GET - Get Batch Results
// =============================================================================

async function handleGetBatchResults(
  req: ApiRequest,
  context?: { params: Promise<Record<string, string>> }
): Promise<NextResponse> {
  const params = await context?.params;
  const id = params?.id;

  if (!id) {
    throw new NotFoundError('Batch not found');
  }

  const { organization } = req;
  const { searchParams } = new URL(req.url);

  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const status = searchParams.get('status') || undefined;

  const results = await getBatchResults(id, organization.id, {
    limit,
    offset,
    status,
  });

  if (!results) {
    throw new NotFoundError('Batch not found');
  }

  return NextResponse.json(results);
}

export const GET = withApiMiddleware(handleGetBatchResults);
