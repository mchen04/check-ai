/**
 * POST /api/v1/verify
 * Main verification endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ValidationError,
  withApiMiddleware,
  ApiRequest,
  throwVerifyApiError,
} from '@/lib/api';
import { verify, validateVerifyRequest, OrganizationContext } from '@/lib/verification';

// =============================================================================
// HANDLER
// =============================================================================

async function handleVerify(req: ApiRequest): Promise<NextResponse> {
  // Parse request body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    throw new ValidationError('Invalid JSON in request body');
  }

  // Validate request
  const validation = validateVerifyRequest(rawBody);
  if (!validation.success) {
    throw new ValidationError('Invalid request body', { errors: validation.errors });
  }

  // Build organization context
  const { organization } = req;
  const orgContext: OrganizationContext = {
    id: organization.id,
    name: organization.name,
    planType: organization.planType,
    dataRetentionEnabled: organization.dataRetentionEnabled,
    verificationRetentionDays: organization.verificationRetentionDays,
  };

  // Execute verification via service
  const result = await verify({
    organization: orgContext,
    request: validation.data,
  });

  // Handle service errors using unified mapper
  if (!result.success) {
    throwVerifyApiError(result.error);
  }

  // Return success response
  return NextResponse.json(result.data, { status: 200 });
}

// =============================================================================
// EXPORTS
// =============================================================================

export const POST = withApiMiddleware(handleVerify);

// GET endpoint for retrieving verification status
export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Use POST to create a verification. Use GET /api/v1/verify/[id] to retrieve status.',
    },
    { status: 405 }
  );
}
