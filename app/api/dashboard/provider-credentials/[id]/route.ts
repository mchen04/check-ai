import { NextResponse } from 'next/server';
import { withDashboardAuth, DashboardRequest } from '@/lib/api';
import {
  getProviderCredential,
  updateProviderCredential,
  deleteProviderCredential,
} from '@/lib/api-keys/provider-credentials';
import { updateProviderCredentialSchema } from '@/lib/api-keys/types';
import { createAuditLogger } from '@/lib/audit';
import { extractRouteParam, RouteContext, errorResponse, parseAndValidate } from '@/lib/api/validation';

// =============================================================================
// GET - Get a specific provider credential
// =============================================================================

export const GET = withDashboardAuth(
  async (req: DashboardRequest, routeContext?: RouteContext) => {
    const { context } = req;
    const id = await extractRouteParam(routeContext);

    const credential = await getProviderCredential(context.orgId, id);

    if (!credential) {
      return errorResponse.notFound('Credential not found');
    }

    return NextResponse.json({ credential });
  },
  { permission: 'api_keys:view' }
);

// =============================================================================
// PATCH - Update a provider credential
// =============================================================================

export const PATCH = withDashboardAuth(
  async (req: DashboardRequest, routeContext?: RouteContext) => {
    const { context } = req;
    const audit = createAuditLogger(context, req);
    const id = await extractRouteParam(routeContext);

    // Parse and validate using shared helper
    const result = await parseAndValidate(req, updateProviderCredentialSchema);
    if (!result.success) return result.error;

    const { name, apiKey, config, isActive } = result.data;

    const updated = await updateProviderCredential(context.orgId, id, {
      name,
      apiKey,
      config,
      isActive,
    });

    if (!updated) {
      return errorResponse.notFound('Credential not found');
    }

    audit.log({
      eventType: 'api_key.created', // Using this since we don't have a specific event
      description: `Provider credential "${name || id}" updated`,
      resourceType: 'provider_credential',
      resourceId: id,
      changes: { after: { name, hasNewApiKey: !!apiKey, isActive } },
    });

    return NextResponse.json({ success: true });
  },
  { permission: 'api_keys:create' }
);

// =============================================================================
// DELETE - Delete a provider credential
// =============================================================================

export const DELETE = withDashboardAuth(
  async (req: DashboardRequest, routeContext?: RouteContext) => {
    const { context } = req;
    const audit = createAuditLogger(context, req);
    const id = await extractRouteParam(routeContext);

    // Get the credential first for logging
    const credential = await getProviderCredential(context.orgId, id);

    if (!credential) {
      return errorResponse.notFound('Credential not found');
    }

    const deleted = await deleteProviderCredential(context.orgId, id);

    if (!deleted) {
      return errorResponse.internalError('Failed to delete credential');
    }

    audit.log({
      eventType: 'api_key.deleted',
      description: `Provider credential "${credential.name}" deleted`,
      resourceType: 'provider_credential',
      resourceId: id,
    });

    return NextResponse.json({ success: true });
  },
  { permission: 'api_keys:delete' }
);
