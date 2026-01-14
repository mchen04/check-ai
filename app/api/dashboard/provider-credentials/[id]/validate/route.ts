import { NextResponse } from 'next/server';
import { withDashboardAuth, DashboardRequest } from '@/lib/api';
import { validateProviderCredential } from '@/lib/api-keys/provider-credentials';

// =============================================================================
// POST - Validate a provider credential
// =============================================================================

export const POST = withDashboardAuth(
  async (req: DashboardRequest, routeContext) => {
    const { context } = req;
    const { id } = await routeContext!.params;

    const result = await validateProviderCredential(context.orgId, id);

    return NextResponse.json(result);
  },
  { permission: 'api_keys:view' }
);
