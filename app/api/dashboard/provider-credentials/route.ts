import { NextResponse } from 'next/server';
import { withDashboardAuth, DashboardRequest, parseAndValidate } from '@/lib/api';
import {
  createProviderCredential,
  listProviderCredentials,
  createProviderCredentialSchema,
} from '@/lib/api-keys';
import { createAuditLogger } from '@/lib/audit';

// =============================================================================
// GET - List provider credentials
// =============================================================================

export const GET = withDashboardAuth(
  async (req: DashboardRequest) => {
    const { context } = req;

    const credentials = await listProviderCredentials(context.orgId);

    return NextResponse.json({ credentials });
  },
  { permission: 'api_keys:view' }
);

// =============================================================================
// POST - Create new provider credential
// =============================================================================

export const POST = withDashboardAuth(
  async (req: DashboardRequest) => {
    const { context } = req;
    const audit = createAuditLogger(context, req);

    // Parse and validate using shared helper
    const result = await parseAndValidate(req, createProviderCredentialSchema);
    if (!result.success) return result.error;

    const credential = await createProviderCredential(context.orgId, result.data);

    audit.log({
      eventType: 'api_key.created',
      description: `Provider credential "${result.data.name}" created for ${result.data.provider}`,
      resourceType: 'provider_credential',
      resourceId: credential.id,
      changes: { after: { name: result.data.name, provider: result.data.provider } },
    });

    return NextResponse.json(credential);
  },
  { permission: 'api_keys:create' }
);
