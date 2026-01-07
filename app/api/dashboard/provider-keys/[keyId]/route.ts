import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { apiKeysTable } from '@/utils/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { logAuditEvent, extractRequestMetadata } from '@/lib/audit';
import { getUserOrgContext, checkPermission } from '@/lib/rbac/get-user-org';

interface RouteContext {
  params: Promise<{ keyId: string }>;
}

// GET /api/dashboard/provider-keys/[keyId] - Get a single provider key
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const userContext = await getUserOrgContext();
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(userContext, 'api_keys:view');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const { keyId } = await context.params;

    const [key] = await db
      .select({
        id: apiKeysTable.id,
        name: apiKeysTable.name,
        provider: apiKeysTable.provider,
        keyPrefix: apiKeysTable.keyPrefix,
        isActive: apiKeysTable.isActive,
        lastUsedAt: apiKeysTable.lastUsedAt,
        createdAt: apiKeysTable.createdAt,
      })
      .from(apiKeysTable)
      .where(
        and(
          eq(apiKeysTable.id, keyId),
          eq(apiKeysTable.orgId, userContext.orgId),
          ne(apiKeysTable.provider, 'platform')
        )
      )
      .limit(1);

    if (!key) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    return NextResponse.json({ key });
  } catch (error) {
    console.error('Error fetching provider key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/dashboard/provider-keys/[keyId] - Update a provider key (name or active status)
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const userContext = await getUserOrgContext();
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(userContext, 'api_keys:create');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const { keyId } = await context.params;
    const body = await request.json();
    const { name, isActive } = body;

    // Verify key exists and belongs to this org
    const [existingKey] = await db
      .select({
        id: apiKeysTable.id,
        name: apiKeysTable.name,
        provider: apiKeysTable.provider,
        isActive: apiKeysTable.isActive,
      })
      .from(apiKeysTable)
      .where(
        and(
          eq(apiKeysTable.id, keyId),
          eq(apiKeysTable.orgId, userContext.orgId),
          ne(apiKeysTable.provider, 'platform')
        )
      )
      .limit(1);

    if (!existingKey) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    // Build update object
    const updates: { name?: string; isActive?: boolean } = {};
    if (name !== undefined && typeof name === 'string' && name.trim().length > 0) {
      updates.name = name.trim();
    }
    if (typeof isActive === 'boolean') {
      updates.isActive = isActive;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    // Update the key
    await db
      .update(apiKeysTable)
      .set(updates)
      .where(eq(apiKeysTable.id, keyId));

    // Log audit event (using api_key.created as a workaround since no api_key.updated event exists)
    logAuditEvent({
      orgId: userContext.orgId,
      userId: userContext.userId,
      eventType: 'api_key.created',
      description: `${existingKey.provider} API key updated (BYOK)`,
      resourceType: 'api_key',
      resourceId: keyId,
      changes: { before: existingKey, after: { ...existingKey, ...updates } },
      metadata: extractRequestMetadata(request),
    });

    return NextResponse.json({ success: true, ...updates });
  } catch (error) {
    console.error('Error updating provider key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/dashboard/provider-keys/[keyId] - Delete a provider key
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const userContext = await getUserOrgContext();
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(userContext, 'api_keys:delete');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const { keyId } = await context.params;

    // Verify key exists and belongs to this org
    const [existingKey] = await db
      .select({
        id: apiKeysTable.id,
        name: apiKeysTable.name,
        provider: apiKeysTable.provider,
      })
      .from(apiKeysTable)
      .where(
        and(
          eq(apiKeysTable.id, keyId),
          eq(apiKeysTable.orgId, userContext.orgId),
          ne(apiKeysTable.provider, 'platform')
        )
      )
      .limit(1);

    if (!existingKey) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    // Delete the key permanently (not soft delete for provider keys)
    await db.delete(apiKeysTable).where(eq(apiKeysTable.id, keyId));

    // Log audit event
    logAuditEvent({
      orgId: userContext.orgId,
      userId: userContext.userId,
      eventType: 'api_key.deleted',
      description: `${existingKey.provider} API key deleted (BYOK)`,
      resourceType: 'api_key',
      resourceId: keyId,
      metadata: extractRequestMetadata(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting provider key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
