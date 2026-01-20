import { NextResponse } from 'next/server';
import { createAuditLogger } from '@/lib/audit';
import {
  withDashboardAuth,
  DashboardRequest,
  extractRouteParam,
  RouteContext,
  parseAndValidate,
  errorResponse,
  successResponse,
  formatRequiredDateToISO,
} from '@/lib/api';
import {
  listApiKeyCredentials,
  addCredentialToApiKey,
  removeCredentialFromApiKey,
  setDefaultCredential,
} from '@/lib/api-keys';
import { z } from 'zod';

// =============================================================================
// GET - List credentials for an API key
// =============================================================================

export const GET = withDashboardAuth(
  async (req: DashboardRequest, routeContext?: RouteContext) => {
    const { context } = req;
    const keyId = await extractRouteParam(routeContext);

    const credentials = await listApiKeyCredentials(context.orgId, keyId);

    return NextResponse.json({
      credentials: credentials.map((c) => ({
        id: c.id,
        providerCredentialId: c.providerCredentialId,
        isDefault: c.isDefault,
        createdAt: formatRequiredDateToISO(c.createdAt),
        credential: c.credential
          ? {
              id: c.credential.id,
              name: c.credential.name,
              provider: c.credential.provider,
              isActive: c.credential.isActive,
              validationStatus: c.credential.validationStatus,
            }
          : null,
      })),
    });
  },
  { permission: 'api_keys:view' }
);

// =============================================================================
// POST - Add a credential to an API key
// =============================================================================

const addCredentialSchema = z.object({
  credentialId: z.uuid(),
  setAsDefault: z.boolean().optional().default(false),
});

export const POST = withDashboardAuth(
  async (req: DashboardRequest, routeContext?: RouteContext) => {
    const { context } = req;
    const audit = createAuditLogger(context, req);
    const keyId = await extractRouteParam(routeContext);

    // Parse and validate request body
    const parseResult = await parseAndValidate(req, addCredentialSchema);
    if (!parseResult.success) return parseResult.error;
    const parsed = parseResult;

    const result = await addCredentialToApiKey(
      context.orgId,
      keyId,
      parsed.data.credentialId,
      parsed.data.setAsDefault
    );

    if (!result.success) {
      return errorResponse.badRequest(result.error || 'Failed to add credential');
    }

    audit.log({
      eventType: 'api_key.created',
      description: `Credential added to API key`,
      resourceType: 'api_key',
      resourceId: keyId,
      changes: {
        after: {
          credentialId: parsed.data.credentialId,
          setAsDefault: parsed.data.setAsDefault,
        },
      },
    });

    return successResponse.ok();
  },
  { permission: 'api_keys:create' }
);

// =============================================================================
// DELETE - Remove a credential from an API key
// =============================================================================

export const DELETE = withDashboardAuth(
  async (req: DashboardRequest, routeContext?: RouteContext) => {
    const { context } = req;
    const audit = createAuditLogger(context, req);
    const keyId = await extractRouteParam(routeContext);

    const { searchParams } = new URL(req.url);
    const credentialId = searchParams.get('credentialId');

    if (!credentialId) {
      return errorResponse.badRequest('Credential ID is required');
    }

    const result = await removeCredentialFromApiKey(context.orgId, keyId, credentialId);

    if (!result.success) {
      return errorResponse.badRequest(result.error || 'Failed to remove credential');
    }

    audit.log({
      eventType: 'api_key.deleted',
      description: `Credential removed from API key`,
      resourceType: 'api_key',
      resourceId: keyId,
      changes: {
        before: { credentialId },
      },
    });

    return successResponse.ok();
  },
  { permission: 'api_keys:create' }
);

// =============================================================================
// PATCH - Set a credential as default
// =============================================================================

const setDefaultSchema = z.object({
  credentialId: z.uuid(),
});

export const PATCH = withDashboardAuth(
  async (req: DashboardRequest, routeContext?: RouteContext) => {
    const { context } = req;
    const audit = createAuditLogger(context, req);
    const keyId = await extractRouteParam(routeContext);

    // Parse and validate request body
    const parseResult = await parseAndValidate(req, setDefaultSchema);
    if (!parseResult.success) return parseResult.error;
    const parsed = parseResult;

    const result = await setDefaultCredential(context.orgId, keyId, parsed.data.credentialId);

    if (!result.success) {
      return errorResponse.badRequest(result.error || 'Failed to set default credential');
    }

    audit.log({
      eventType: 'api_key.created',
      description: `Default credential changed for API key`,
      resourceType: 'api_key',
      resourceId: keyId,
      changes: {
        after: { defaultCredentialId: parsed.data.credentialId },
      },
    });

    return successResponse.ok();
  },
  { permission: 'api_keys:create' }
);
