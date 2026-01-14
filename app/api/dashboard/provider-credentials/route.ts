import { NextResponse } from 'next/server';
import { withDashboardAuth, DashboardRequest } from '@/lib/api';
import {
  createProviderCredential,
  listProviderCredentials,
} from '@/lib/api-keys/provider-credentials';
import { createProviderCredentialSchema } from '@/lib/api-keys/types';
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

    const body = await req.json();
    const parsed = createProviderCredentialSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await createProviderCredential(context.orgId, parsed.data);

    audit.log({
      eventType: 'api_key.created',
      description: `Provider credential "${parsed.data.name}" created for ${parsed.data.provider}`,
      resourceType: 'provider_credential',
      resourceId: result.id,
      changes: { after: { name: parsed.data.name, provider: parsed.data.provider } },
    });

    return NextResponse.json(result);
  },
  { permission: 'api_keys:create' }
);
