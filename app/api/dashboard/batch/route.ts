/**
 * POST /api/dashboard/batch - Create a new batch job (session auth for dashboard)
 */

import { NextResponse } from 'next/server';
import {
  createBatch,
  createBatchSchema,
  BATCH_CONSTANTS,
  consumeStoredFile,
} from '@/lib/batch';
import { withDashboardAuth, DashboardRequest } from '@/lib/api';
import { PLAN_LIMITS } from '@/utils/db/schema';
import { db } from '@/utils/db/db';
import { organizationsTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';

// =============================================================================
// POST - Create Batch
// =============================================================================

async function handleCreateBatch(req: DashboardRequest): Promise<NextResponse> {
  const { context } = req;

  // Parse request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate with zod
  const parseResult = createBatchSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const validatedBody = parseResult.data;

  // Get organization details
  const [org] = await db
    .select({
      id: organizationsTable.id,
      planType: organizationsTable.planType,
    })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, context.orgId))
    .limit(1);

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Check plan allows batch processing
  const planLimits = PLAN_LIMITS[org.planType as keyof typeof PLAN_LIMITS];
  if (org.planType === 'free') {
    return NextResponse.json(
      { error: 'Batch processing is not available on the free plan. Please upgrade to Pro or Enterprise.' },
      { status: 403 }
    );
  }

  // Validate items source
  if (!validatedBody.items && !validatedBody.fileId) {
    return NextResponse.json({ error: 'Either items array or fileId must be provided' }, { status: 400 });
  }

  if (validatedBody.items && validatedBody.fileId) {
    return NextResponse.json({ error: 'Cannot provide both items array and fileId' }, { status: 400 });
  }

  // Validate item count
  if (validatedBody.items) {
    if (validatedBody.items.length > BATCH_CONSTANTS.MAX_ITEMS) {
      return NextResponse.json(
        { error: `Batch cannot exceed ${BATCH_CONSTANTS.MAX_ITEMS} items. Received ${validatedBody.items.length} items.` },
        { status: 400 }
      );
    }
  }

  // Check if requested methods are allowed for plan
  const requestedMethods = Object.entries(validatedBody.methods)
    .filter(([, weight]) => weight !== undefined && weight > 0)
    .map(([method]) => method);

  const disallowedMethods = requestedMethods.filter(
    (method) => !(planLimits.allowedMethods as readonly string[]).includes(method)
  );

  if (disallowedMethods.length > 0) {
    return NextResponse.json(
      { error: `Methods not allowed on your plan: ${disallowedMethods.join(', ')}` },
      { status: 403 }
    );
  }

  // Get items from request body or file storage
  let items = validatedBody.items || [];

  // If fileId provided, get and atomically delete items from temporary storage
  if (validatedBody.fileId) {
    // consumeStoredFile uses atomic GETDEL to ensure one-time use
    const storedFile = await consumeStoredFile(validatedBody.fileId, context.orgId);

    if (!storedFile) {
      return NextResponse.json(
        { error: 'File not found, expired, or already used. Please upload the file again.' },
        { status: 404 }
      );
    }

    items = storedFile.items.map((item) => ({
      content: item.content,
      context: item.context,
      idempotencyKey: item.idempotencyKey,
    }));
  }

  // Create batch
  const { batchId, validationErrors } = await createBatch(context.orgId, validatedBody, items);

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

export const POST = withDashboardAuth(handleCreateBatch, { permission: 'verifications:create' });
