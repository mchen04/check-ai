import { NextResponse } from 'next/server';
import { createAuditLogger } from '@/lib/audit';
import { withDashboardAuth, DashboardRequest } from '@/lib/api';
import {
  createApiKey,
  listApiKeys,
  deleteApiKey,
  updateApiKey,
} from '@/lib/api-keys/service';
import { createApiKeySchema, updateApiKeySchema } from '@/lib/api-keys/types';
import { parseAndValidate, errorResponse, successResponse } from '@/lib/api/validation';
import { formatDateToISO, formatRequiredDateToISO } from '@/lib/api/formatters';

// =============================================================================
// GET - List API keys with paradigm config
// =============================================================================

export const GET = withDashboardAuth(
  async (req: DashboardRequest) => {
    const { context } = req;

    const keys = await listApiKeys(context.orgId);

    // Transform for API response
    const response = keys.map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      providerCredential: key.providerCredential
        ? {
            id: key.providerCredential.id,
            name: key.providerCredential.name,
            provider: key.providerCredential.provider,
          }
        : null,
      credentials: key.credentials?.map((c) => ({
        id: c.id,
        providerCredentialId: c.providerCredentialId,
        isDefault: c.isDefault,
        credential: c.credential
          ? {
              id: c.credential.id,
              name: c.credential.name,
              provider: c.credential.provider,
              isActive: c.credential.isActive,
            }
          : null,
      })),
      paradigmConfig: key.paradigmConfig,
      defaultThresholds: key.defaultThresholds,
      isActive: key.isActive,
      lastUsedAt: formatDateToISO(key.lastUsedAt),
      createdAt: formatRequiredDateToISO(key.createdAt),
      expiresAt: formatDateToISO(key.expiresAt),
    }));

    return NextResponse.json({ keys: response });
  },
  { permission: 'api_keys:view' }
);

// =============================================================================
// POST - Create new API key with paradigm config
// =============================================================================

export const POST = withDashboardAuth(
  async (req: DashboardRequest) => {
    const { context } = req;
    const audit = createAuditLogger(context, req);

    // Parse and validate request body
    const parseResult = await parseAndValidate(req, createApiKeySchema);
    if (!parseResult.success) return parseResult.error;
    const parsed = parseResult;

    const result = await createApiKey(context.orgId, parsed.data);

    audit.log({
      eventType: 'api_key.created',
      description: `API key "${parsed.data.name}" created`,
      resourceType: 'api_key',
      resourceId: result.id,
      changes: {
        after: {
          name: parsed.data.name,
          keyPrefix: result.prefix,
          providerCredentialIds: parsed.data.providerCredentialIds,
          paradigmConfig: parsed.data.paradigmConfig,
        },
      },
    });

    // Return the full key - this is the only time it will be shown
    return NextResponse.json({
      id: result.id,
      apiKey: result.apiKey,
      keyPrefix: result.prefix,
      name: parsed.data.name,
    });
  },
  { permission: 'api_keys:create' }
);

// =============================================================================
// DELETE - Delete an API key
// =============================================================================

export const DELETE = withDashboardAuth(
  async (req: DashboardRequest) => {
    const { context } = req;
    const audit = createAuditLogger(context, req);

    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return errorResponse.badRequest('Key ID is required');
    }

    const deleted = await deleteApiKey(context.orgId, keyId);

    if (!deleted) {
      return errorResponse.notFound('Key not found');
    }

    audit.log({
      eventType: 'api_key.deleted',
      description: `API key deleted`,
      resourceType: 'api_key',
      resourceId: keyId,
    });

    return successResponse.ok();
  },
  { permission: 'api_keys:delete' }
);

// =============================================================================
// PATCH - Update an API key
// =============================================================================

export const PATCH = withDashboardAuth(
  async (req: DashboardRequest) => {
    const { context } = req;
    const audit = createAuditLogger(context, req);

    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return errorResponse.badRequest('Key ID is required');
    }

    // Parse and validate using shared helper
    const result = await parseAndValidate(req, updateApiKeySchema);
    if (!result.success) return result.error;

    const { name, paradigmConfig, defaultThresholds, isActive } = result.data;

    const updated = await updateApiKey(context.orgId, keyId, {
      name,
      paradigmConfig,
      defaultThresholds,
      isActive,
    });

    if (!updated) {
      return errorResponse.notFound('Key not found');
    }

    audit.log({
      eventType: 'api_key.created', // Reusing for updates
      description: `API key "${name || keyId}" updated`,
      resourceType: 'api_key',
      resourceId: keyId,
      changes: { after: { name, paradigmConfig, isActive } },
    });

    return successResponse.ok();
  },
  { permission: 'api_keys:create' }
);
