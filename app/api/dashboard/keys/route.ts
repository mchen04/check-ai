import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/utils/db/db';
import { apiKeysTable } from '@/utils/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import { logAuditEvent, extractRequestMetadata } from '@/lib/audit';

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
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get API keys - in production, filter by orgId
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
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate the API key
    const { key, prefix, hash } = generateApiKey();

    // For now, use a placeholder orgId since organizations might not be set up
    // In production, get the user's organization
    const orgId = '00000000-0000-0000-0000-000000000000';

    // Insert the new key
    const [newKey] = await db
      .insert(apiKeysTable)
      .values({
        orgId,
        name: name.trim(),
        keyHash: hash,
        keyPrefix: prefix,
        provider: 'platform',
        isActive: true,
      })
      .returning({
        id: apiKeysTable.id,
        name: apiKeysTable.name,
        keyPrefix: apiKeysTable.keyPrefix,
        createdAt: apiKeysTable.createdAt,
      });

    // Log audit event
    logAuditEvent({
      orgId,
      userId: user.id,
      eventType: 'api_key.created',
      description: `API key "${name.trim()}" created`,
      resourceType: 'api_key',
      resourceId: newKey.id,
      changes: { after: { name: name.trim(), keyPrefix: prefix, provider: 'platform' } },
      metadata: extractRequestMetadata(request),
    });

    // Return the full key - this is the only time it will be shown
    return NextResponse.json({
      key,
      id: newKey.id,
      name: newKey.name,
      keyPrefix: newKey.keyPrefix,
      createdAt: newKey.createdAt,
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/dashboard/keys - Delete an API key
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    // Get the key details first for audit log
    const [keyToDelete] = await db
      .select({ orgId: apiKeysTable.orgId, name: apiKeysTable.name })
      .from(apiKeysTable)
      .where(eq(apiKeysTable.id, keyId));

    // Soft delete by setting isActive to false
    await db
      .update(apiKeysTable)
      .set({ isActive: false })
      .where(eq(apiKeysTable.id, keyId));

    // Log audit event
    if (keyToDelete) {
      logAuditEvent({
        orgId: keyToDelete.orgId,
        userId: user.id,
        eventType: 'api_key.deleted',
        description: `API key "${keyToDelete.name}" deleted`,
        resourceType: 'api_key',
        resourceId: keyId,
        metadata: extractRequestMetadata(request),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
