/**
 * POST /api/v1/batch/upload - Upload a batch file (CSV/JSON)
 */

export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { parseFile, storeUploadedFile, isFileStorageAvailable, BATCH_CONSTANTS } from '@/lib/batch';
import {
  ApiError,
  ValidationError,
  QuotaExceededError,
  PayloadTooLargeError,
  withApiMiddleware,
  ApiRequest,
} from '@/lib/api';
import { PLAN_LIMITS } from '@/utils/db/schema';

// =============================================================================
// Constants
// =============================================================================

const MAX_FILE_SIZE = BATCH_CONSTANTS.MAX_FILE_SIZE_MB * 1024 * 1024; // 10MB in bytes

// =============================================================================
// POST - Upload Batch File
// =============================================================================

async function handleUploadFile(req: ApiRequest): Promise<NextResponse> {
  const { organization } = req;

  // Check plan allows batch processing
  if (organization.planType === 'free') {
    throw new QuotaExceededError(
      'Batch processing is not available on the free plan. Please upgrade to Pro or Enterprise.'
    );
  }

  // Check if file storage is available
  if (!isFileStorageAvailable()) {
    throw new ApiError(
      'File upload is not configured. Please use direct JSON items array instead.',
      503,
      'FILE_STORAGE_UNAVAILABLE'
    );
  }

  // Parse multipart form data
  const formData = await req.formData().catch(() => null);

  if (!formData) {
    throw new ValidationError('Request must be multipart/form-data');
  }

  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    throw new ValidationError('File is required. Use form field name "file".');
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new PayloadTooLargeError(MAX_FILE_SIZE);
  }

  // Read file content
  const content = await file.text();

  if (!content.trim()) {
    throw new ValidationError('File is empty');
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
    organization.id,
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

export const POST = withApiMiddleware(handleUploadFile);
