import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { apiKeysTable } from '@/utils/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import { logAuditEvent, extractRequestMetadata } from '@/lib/audit';
import { getUserOrgContext, checkPermission } from '@/lib/rbac/get-user-org';

// Generate a new API key
function generateApiKey(): { key: string; prefix: string; hash: string } {
  // Generate a random 32-byte key and encode as base64
  const keyBytes = randomBytes(32);
  const key = `vfy_${keyBytes.toString('base64url')}`;
  const prefix = key.slice(0, 12); // "vfy_" + 8 chars
  const hash = createHash('sha256').update(key).digest('hex');

  return { key, prefix, hash };
}

// GET /api/dashboard/keys - List API keys
export async function GET() {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(context, 'api_keys:view');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    // Get API keys filtered by organization
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
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/dashboard/keys - Create new API key
export async function POST(request: NextRequest) {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(context, 'api_keys:create');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const body = await request.json();
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

    // Insert the new key with user's actual organization ID
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
      metadata: extractRequestMetadata(request),
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
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/dashboard/keys - Delete an API key
export async function DELETE(request: NextRequest) {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(context, 'api_keys:delete');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    // Get the key details first - ensure it belongs to this org
    const [keyToDelete] = await db
      .select({ orgId: apiKeysTable.orgId, name: apiKeysTable.name })
      .from(apiKeysTable)
      .where(and(eq(apiKeysTable.id, keyId), eq(apiKeysTable.orgId, context.orgId)));

    if (!keyToDelete) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    // Soft delete by setting isActive to false
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
      metadata: extractRequestMetadata(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/dashboard/keys - Rotate an API key
export async function PATCH(request: NextRequest) {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(context, 'api_keys:create');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
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
        expiresAt: existingKey.expiresAt, // Preserve expiration
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
      metadata: extractRequestMetadata(request),
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
  } catch (error) {
    console.error('Error rotating API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
