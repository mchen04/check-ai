import { NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { apiKeysTable } from '@/utils/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import { logAuditEvent, extractRequestMetadata } from '@/lib/audit';
import { withDashboardAuth, DashboardRequest } from '@/lib/api';

// =============================================================================
// HELPERS
// =============================================================================

function generateApiKey(): { key: string; prefix: string; hash: string } {
  const keyBytes = randomBytes(32);
  const key = `vfy_${keyBytes.toString('base64url')}`;
  const prefix = key.slice(0, 12); // "vfy_" + 8 chars
  const hash = createHash('sha256').update(key).digest('hex');
  return { key, prefix, hash };
}

// =============================================================================
// GET - List API keys
// =============================================================================

export const GET = withDashboardAuth(async (req: DashboardRequest) => {
  const { context } = req;

  const keys = await db
    .select({
      id: apiKeysTable.id,
      name: apiKeysTable.name,
      keyPrefix: apiKeysTable.keyPrefix,
      provider: apiKeysTable.provider,
      isActive: apiKeysTable.isActive,
      lastUsedAt: apiKeysTable.lastUsedAt,
      createdAt: apiKeysTable.createdAt,
      expiresAt: apiKeysTable.expiresAt,
    })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.orgId, context.orgId))
    .orderBy(desc(apiKeysTable.createdAt))
    .limit(50);

  return NextResponse.json({ keys });
}, { permission: 'api_keys:view' });

// =============================================================================
// POST - Create new API key
// =============================================================================

export const POST = withDashboardAuth(async (req: DashboardRequest) => {
  const { context } = req;

  const body = await req.json();
  const { name, expiresIn } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  // Generate the API key
  const { key, prefix, hash } = generateApiKey();

  // Calculate expiration date if specified
  let expiresAt: Date | null = null;
  if (expiresIn && expiresIn !== 'never') {
    const daysMap: Record<string, number> = {
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };
    const days = daysMap[expiresIn];
    if (days) {
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }
  }

  // Insert the new key
  const [newKey] = await db
    .insert(apiKeysTable)
    .values({
      orgId: context.orgId,
      name: name.trim(),
      keyHash: hash,
      keyPrefix: prefix,
      provider: 'platform',
      isActive: true,
      expiresAt,
    })
    .returning({
      id: apiKeysTable.id,
      name: apiKeysTable.name,
      keyPrefix: apiKeysTable.keyPrefix,
      createdAt: apiKeysTable.createdAt,
      expiresAt: apiKeysTable.expiresAt,
    });

  // Log audit event
  logAuditEvent({
    orgId: context.orgId,
    userId: context.userId,
    eventType: 'api_key.created',
    description: `API key "${name.trim()}" created`,
    resourceType: 'api_key',
    resourceId: newKey.id,
    changes: { after: { name: name.trim(), keyPrefix: prefix, provider: 'platform', expiresAt } },
    metadata: extractRequestMetadata(req),
  });

  // Return the full key - this is the only time it will be shown
  return NextResponse.json({
    key,
    id: newKey.id,
    name: newKey.name,
    keyPrefix: newKey.keyPrefix,
    createdAt: newKey.createdAt,
    expiresAt: newKey.expiresAt,
  });
}, { permission: 'api_keys:create' });

// =============================================================================
// DELETE - Delete an API key
// =============================================================================

export const DELETE = withDashboardAuth(async (req: DashboardRequest) => {
  const { context } = req;

  const { searchParams } = new URL(req.url);
  const keyId = searchParams.get('id');

  if (!keyId) {
    return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
  }

  // Ensure key belongs to this org
  const [keyToDelete] = await db
    .select({ orgId: apiKeysTable.orgId, name: apiKeysTable.name })
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.id, keyId), eq(apiKeysTable.orgId, context.orgId)));

  if (!keyToDelete) {
    return NextResponse.json({ error: 'Key not found' }, { status: 404 });
  }

  // Soft delete
  await db
    .update(apiKeysTable)
    .set({ isActive: false })
    .where(eq(apiKeysTable.id, keyId));

  // Log audit event
  logAuditEvent({
    orgId: context.orgId,
    userId: context.userId,
    eventType: 'api_key.deleted',
    description: `API key "${keyToDelete.name}" deleted`,
    resourceType: 'api_key',
    resourceId: keyId,
    metadata: extractRequestMetadata(req),
  });

  return NextResponse.json({ success: true });
}, { permission: 'api_keys:delete' });

// =============================================================================
// PATCH - Rotate an API key
// =============================================================================

export const PATCH = withDashboardAuth(async (req: DashboardRequest) => {
  const { context } = req;

  const { searchParams } = new URL(req.url);
  const keyId = searchParams.get('id');

  if (!keyId) {
    return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
  }

  // Verify key belongs to user's org
  const [existingKey] = await db
    .select({
      id: apiKeysTable.id,
      orgId: apiKeysTable.orgId,
      name: apiKeysTable.name,
      expiresAt: apiKeysTable.expiresAt,
    })
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.id, keyId), eq(apiKeysTable.orgId, context.orgId)));

  if (!existingKey) {
    return NextResponse.json({ error: 'Key not found' }, { status: 404 });
  }

  // Deactivate old key
  await db.update(apiKeysTable).set({ isActive: false }).where(eq(apiKeysTable.id, keyId));

  // Generate new key with same name
  const { key, prefix, hash } = generateApiKey();

  const [newKey] = await db
    .insert(apiKeysTable)
    .values({
      orgId: context.orgId,
      name: existingKey.name,
      keyHash: hash,
      keyPrefix: prefix,
      provider: 'platform',
      isActive: true,
      expiresAt: existingKey.expiresAt,
    })
    .returning({
      id: apiKeysTable.id,
      keyPrefix: apiKeysTable.keyPrefix,
      createdAt: apiKeysTable.createdAt,
      expiresAt: apiKeysTable.expiresAt,
    });

  // Log audit event
  logAuditEvent({
    orgId: context.orgId,
    userId: context.userId,
    eventType: 'api_key.created',
    description: `API key "${existingKey.name}" rotated`,
    resourceType: 'api_key',
    resourceId: newKey.id,
    changes: { before: { keyId }, after: { keyId: newKey.id } },
    metadata: extractRequestMetadata(req),
  });

  return NextResponse.json({
    key,
    id: newKey.id,
    name: existingKey.name,
    keyPrefix: newKey.keyPrefix,
    previousKeyId: keyId,
    createdAt: newKey.createdAt,
    expiresAt: newKey.expiresAt,
  });
}, { permission: 'api_keys:create' });
