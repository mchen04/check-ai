import { NextResponse } from 'next/server';
import { createAuditLogger } from '@/lib/audit';
import { withDashboardAuth, DashboardRequest } from '@/lib/api';
import {
  listApiKeyCredentials,
  addCredentialToApiKey,
  removeCredentialFromApiKey,
  setDefaultCredential,
} from '@/lib/api-keys/service';
import { z } from 'zod';

// =============================================================================
// GET - List credentials for an API key
// =============================================================================

export const GET = withDashboardAuth(
  async (req: DashboardRequest, routeContext) => {
    const { context } = req;
    const { id: keyId } = await routeContext!.params;

    const credentials = await listApiKeyCredentials(context.orgId, keyId);

    return NextResponse.json({
      credentials: credentials.map((c) => ({
        id: c.id,
        providerCredentialId: c.providerCredentialId,
        isDefault: c.isDefault,
        createdAt: c.createdAt,
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
  credentialId: z.string().uuid(),
  setAsDefault: z.boolean().optional().default(false),
});

export const POST = withDashboardAuth(
  async (req: DashboardRequest, routeContext) => {
    const { context } = req;
    const audit = createAuditLogger(context, req);
    const { id: keyId } = await routeContext!.params;

    const body = await req.json();
    const parsed = addCredentialSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await addCredentialToApiKey(
      context.orgId,
      keyId,
      parsed.data.credentialId,
      parsed.data.setAsDefault
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
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

    return NextResponse.json({ success: true });
  },
  { permission: 'api_keys:create' }
);

// =============================================================================
// DELETE - Remove a credential from an API key
// =============================================================================

export const DELETE = withDashboardAuth(
  async (req: DashboardRequest, routeContext) => {
    const { context } = req;
    const audit = createAuditLogger(context, req);
    const { id: keyId } = await routeContext!.params;

    const { searchParams } = new URL(req.url);
    const credentialId = searchParams.get('credentialId');

    if (!credentialId) {
      return NextResponse.json({ error: 'Credential ID is required' }, { status: 400 });
    }

    const result = await removeCredentialFromApiKey(context.orgId, keyId, credentialId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
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

    return NextResponse.json({ success: true });
  },
  { permission: 'api_keys:create' }
);

// =============================================================================
// PATCH - Set a credential as default
// =============================================================================

const setDefaultSchema = z.object({
  credentialId: z.string().uuid(),
});

export const PATCH = withDashboardAuth(
  async (req: DashboardRequest, routeContext) => {
    const { context } = req;
    const audit = createAuditLogger(context, req);
    const { id: keyId } = await routeContext!.params;

    const body = await req.json();
    const parsed = setDefaultSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await setDefaultCredential(context.orgId, keyId, parsed.data.credentialId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
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

    return NextResponse.json({ success: true });
  },
  { permission: 'api_keys:create' }
);
