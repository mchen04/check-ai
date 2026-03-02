/**
 * POST /api/v1/batch - Create a new batch job
 * GET /api/v1/batch - List batch jobs
 */

import { NextResponse } from 'next/server';
import {
  createBatch,
  listBatches,
  createBatchSchema,
  BATCH_CONSTANTS,
  consumeStoredFile,
} from '@/lib/batch';
import {
  ValidationError,
  NotFoundError,
  QuotaExceededError,
  withApiMiddleware,
  ApiRequest,
  parsePagination,
  parseAndValidateOrThrow,
} from '@/lib/api';
import { PLAN_LIMITS } from '@/utils/db/schema';

// =============================================================================
// POST - Create Batch
// =============================================================================

async function handleCreateBatch(req: ApiRequest): Promise<NextResponse> {
  const body = await parseAndValidateOrThrow(req, createBatchSchema);
  const { organization } = req;

  // Check plan allows batch processing
  const planLimits = PLAN_LIMITS[organization.planType];
  if (!planLimits.batchProcessing) {
    throw new QuotaExceededError(
      'Batch processing is not available on your current plan. Please upgrade to Pro or Enterprise.'
    );
  }

  // Validate items source
  if (!body.items && !body.fileId) {
    throw new ValidationError('Either items array or fileId must be provided');
  }

  if (body.items && body.fileId) {
    throw new ValidationError('Cannot provide both items array and fileId');
  }

  // Validate item count
  if (body.items) {
    if (body.items.length > BATCH_CONSTANTS.MAX_ITEMS) {
      throw new ValidationError(
        `Batch cannot exceed ${BATCH_CONSTANTS.MAX_ITEMS} items. Received ${body.items.length} items.`
      );
    }
  }

  // Check if requested methods are allowed for plan
  const requestedMethods = Object.entries(body.methods)
    .filter(([, weight]) => weight !== undefined && weight > 0)
    .map(([method]) => method);

  const disallowedMethods = requestedMethods.filter(
    (method) => !(planLimits.allowedMethods as readonly string[]).includes(method)
  );

  if (disallowedMethods.length > 0) {
    throw new QuotaExceededError(
      `Methods not allowed on your plan: ${disallowedMethods.join(', ')}`
    );
  }

  // Get items from request body or file storage
  let items = body.items || [];
  let originalFileName: string | undefined;

  // If fileId provided, get and atomically delete items from temporary storage
  if (body.fileId) {
    // consumeStoredFile uses atomic GETDEL to ensure one-time use
    const storedFile = await consumeStoredFile(body.fileId, organization.id);

    if (!storedFile) {
      throw new NotFoundError('File not found, expired, or already used. Please upload the file again.');
    }

    items = storedFile.items.map((item) => ({
      content: item.content,
      context: item.context,
      idempotencyKey: item.idempotencyKey,
    }));
    originalFileName = storedFile.originalFileName;
  }

  // Create batch
  const { batchId, validationErrors } = await createBatch(organization.id, body, items);

  // Return response
  if (validationErrors.length > 0) {
    return NextResponse.json(
      {
        id: batchId,
        status: 'failed',
        validationErrors,
        message: `${validationErrors.length} validation error(s) found`,
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      id: batchId,
      status: 'processing',
      totalItems: items.length,
      message: 'Batch created successfully. Items are being processed.',
    },
    { status: 202 }
  );
}

// =============================================================================
// GET - List Batches
// =============================================================================

async function handleListBatches(req: ApiRequest): Promise<NextResponse> {
  const { organization } = req;
  const { searchParams } = new URL(req.url);

  const { limit, offset } = parsePagination(searchParams);
  const status = searchParams.get('status') || undefined;

  const { batches, total, hasMore } = await listBatches(organization.id, {
    limit,
    offset,
    status,
  });

  return NextResponse.json({
    data: batches,
    pagination: {
      total,
      limit,
      offset,
      hasMore,
    },
  });
}

// =============================================================================
// Route Handler
// =============================================================================

async function handler(req: ApiRequest): Promise<NextResponse> {
  if (req.method === 'POST') {
    return handleCreateBatch(req);
  }
  return handleListBatches(req);
}

export const POST = withApiMiddleware(handler);
export const GET = withApiMiddleware(handler);
