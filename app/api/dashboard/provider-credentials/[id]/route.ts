import { NextRequest, NextResponse } from 'next/server';
import { withDashboardAuth, DashboardRequest } from '@/lib/api';
import {
  getProviderCredential,
  updateProviderCredential,
  deleteProviderCredential,
} from '@/lib/api-keys/provider-credentials';
import { logAuditEvent, extractRequestMetadata } from '@/lib/audit';

// =============================================================================
// GET - Get a specific provider credential
// =============================================================================

export const GET = withDashboardAuth(
  async (req: DashboardRequest, routeContext) => {
    const { context } = req;
    const { id } = await routeContext!.params;

    const credential = await getProviderCredential(context.orgId, id);

    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    return NextResponse.json({ credential });
  },
  { permission: 'api_keys:view' }
);

// =============================================================================
// PATCH - Update a provider credential
// =============================================================================

export const PATCH = withDashboardAuth(
  async (req: DashboardRequest, routeContext) => {
    const { context } = req;
    const { id } = await routeContext!.params;

    const body = await req.json();
    const { name, apiKey, config, isActive } = body;

    const updated = await updateProviderCredential(context.orgId, id, {
      name,
      apiKey,
      config,
      isActive,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    // Log audit event
    logAuditEvent({
      orgId: context.orgId,
      userId: context.userId,
      eventType: 'api_key.created', // Using this since we don't have a specific event
      description: `Provider credential "${name || id}" updated`,
      resourceType: 'provider_credential',
      resourceId: id,
      changes: { after: { name, hasNewApiKey: !!apiKey, isActive } },
      metadata: extractRequestMetadata(req),
    });

    return NextResponse.json({ success: true });
  },
  { permission: 'api_keys:create' }
);

// =============================================================================
// DELETE - Delete a provider credential
// =============================================================================

export const DELETE = withDashboardAuth(
  async (req: DashboardRequest, routeContext) => {
    const { context } = req;
    const { id } = await routeContext!.params;

    // Get the credential first for logging
    const credential = await getProviderCredential(context.orgId, id);

    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    const deleted = await deleteProviderCredential(context.orgId, id);

    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete credential' }, { status: 500 });
    }

    // Log audit event
    logAuditEvent({
      orgId: context.orgId,
      userId: context.userId,
      eventType: 'api_key.deleted',
      description: `Provider credential "${credential.name}" deleted`,
      resourceType: 'provider_credential',
      resourceId: id,
      metadata: extractRequestMetadata(req),
    });

    return NextResponse.json({ success: true });
  },
  { permission: 'api_keys:delete' }
);
