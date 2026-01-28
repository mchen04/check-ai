/**
 * POST /api/dashboard/verify
 * Dashboard verification endpoint (session-based auth for playground)
 */

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { withDashboardAuth, DashboardRequest } from '@/lib/api';
import { verify, validateVerifyRequest, OrganizationContext } from '@/lib/verification';
import { db } from '@/utils/db/db';
import { organizationsTable } from '@/utils/db/schema';

// =============================================================================
// HANDLER
// =============================================================================

async function handleVerify(req: DashboardRequest): Promise<NextResponse> {
  const { context } = req;

  // Parse request body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate request
  const validation = validateVerifyRequest(rawBody);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.errors },
      { status: 400 }
    );
  }

  // Get full organization details for the service
  const [org] = await db
    .select({
      id: organizationsTable.id,
      name: organizationsTable.name,
      planType: organizationsTable.planType,
      dataRetentionEnabled: organizationsTable.dataRetentionEnabled,
      verificationRetentionDays: organizationsTable.verificationRetentionDays,
    })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, context.orgId))
    .limit(1);

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Build organization context
  const orgContext: OrganizationContext = {
    id: org.id,
    name: org.name,
    planType: org.planType as 'free' | 'pro' | 'enterprise',
    dataRetentionEnabled: org.dataRetentionEnabled,
    verificationRetentionDays: org.verificationRetentionDays,
  };

  // Execute verification via service (no API key config - uses request methods directly)
  const result = await verify({
    organization: orgContext,
    request: validation.data,
    // No apiKeyConfig - playground specifies methods directly in the request
  });

  // Handle service errors
  if (!result.success) {
    const statusMap: Record<string, number> = {
      quota_exceeded: 429,
      methods_not_allowed: 403,
      no_api_keys: 400,
      verification_failed: 500,
    };
    return NextResponse.json(
      { error: result.error.message, code: result.error.type, details: result.error.details },
      { status: statusMap[result.error.type] || 500 }
    );
  }

  // Return success response
  return NextResponse.json(result.data, { status: 200 });
}

// =============================================================================
// EXPORTS
// =============================================================================

export const POST = withDashboardAuth(handleVerify, { permission: 'verifications:create' });
