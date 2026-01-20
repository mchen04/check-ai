/**
 * POST /api/dashboard/batch/upload - Upload a batch file (session auth for dashboard)
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { parseFile, storeUploadedFile, isFileStorageAvailable, BATCH_CONSTANTS } from '@/lib/batch';
import { withDashboardAuth, DashboardRequest } from '@/lib/api';
import { PLAN_LIMITS } from '@/utils/db/schema';
import { db } from '@/utils/db/db';
import { organizationsTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';

// =============================================================================
// Constants
// =============================================================================

const MAX_FILE_SIZE = BATCH_CONSTANTS.MAX_FILE_SIZE_MB * 1024 * 1024; // 10MB in bytes

// =============================================================================
// POST - Upload Batch File
// =============================================================================

async function handleUploadFile(req: DashboardRequest): Promise<NextResponse> {
  const { context } = req;

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
  if (org.planType === 'free') {
    return NextResponse.json(
      { error: 'Batch processing is not available on the free plan. Please upgrade to Pro or Enterprise.' },
      { status: 403 }
    );
  }

  // Check if file storage is available
  if (!isFileStorageAvailable()) {
    return NextResponse.json(
      { error: 'File upload is not configured. Please use direct JSON items array instead.' },
      { status: 503 }
    );
  }

  // Parse multipart form data
  const formData = await req.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ error: 'Request must be multipart/form-data' }, { status: 400 });
  }

  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'File is required. Use form field name "file".' }, { status: 400 });
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File size must be less than ${BATCH_CONSTANTS.MAX_FILE_SIZE_MB}MB` },
      { status: 413 }
    );
  }

  // Read file content
  const content = await file.text();

  if (!content.trim()) {
    return NextResponse.json({ error: 'File is empty' }, { status: 400 });
  }

  // Get format hint from form data or filename
  let formatHint = formData.get('format') as string | null;

  if (!formatHint) {
    // Try to detect from filename
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.json')) {
      formatHint = 'json';
    } else if (fileName.endsWith('.csv')) {
      formatHint = 'csv';
    }
  }

  // Parse file
  const parseResult = parseFile(content, formatHint as 'json' | 'csv' | undefined);

  // Return early if there are critical errors
  if (parseResult.items.length === 0 && parseResult.errors.length > 0) {
    return NextResponse.json(
      {
        error: 'File parsing failed',
        validationErrors: parseResult.errors,
      },
      { status: 400 }
    );
  }

  // Generate file ID
  const fileId = uuidv4();

  // Calculate expiry time
  const expiresAt = new Date(Date.now() + BATCH_CONSTANTS.FILE_EXPIRY_HOURS * 60 * 60 * 1000);

  // Store file
  await storeUploadedFile(
    fileId,
    context.orgId,
    parseResult.items,
    file.name,
    parseResult.format
  );

  // Return upload result
  return NextResponse.json({
    fileId,
    originalFileName: file.name,
    format: parseResult.format,
    itemCount: parseResult.items.length,
    validationErrors: parseResult.errors,
    expiresAt: expiresAt.toISOString(),
    message:
      parseResult.errors.length > 0
        ? `File uploaded with ${parseResult.errors.length} validation warning(s). Items with errors were skipped.`
        : 'File uploaded successfully',
  });
}

export const POST = withDashboardAuth(handleUploadFile, { permission: 'verifications:create' });
