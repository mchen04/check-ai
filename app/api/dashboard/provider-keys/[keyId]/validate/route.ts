import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { apiKeysTable } from '@/utils/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { getUserOrgContext, checkPermission } from '@/lib/rbac/get-user-org';
import { getKeyManager, decrypt } from '@/lib/llm/key-manager';
import { LLMProvider } from '@/lib/llm/types';

interface RouteContext {
  params: Promise<{ keyId: string }>;
}

// POST /api/dashboard/provider-keys/[keyId]/validate - Re-validate an existing provider key
export async function POST(
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

    // Get the key with encrypted value
    const [key] = await db
      .select({
        id: apiKeysTable.id,
        provider: apiKeysTable.provider,
        encryptedKey: apiKeysTable.encryptedKey,
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

    if (!key) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    if (!key.encryptedKey) {
      return NextResponse.json({ error: 'Key has no encrypted value' }, { status: 400 });
    }

    // Decrypt the key
    let decryptedKey: string;
    try {
      decryptedKey = decrypt(key.encryptedKey);
    } catch (error) {
      console.error('Failed to decrypt key:', error);
      return NextResponse.json({ error: 'Failed to decrypt key' }, { status: 500 });
    }

    // Validate with the provider
    const keyManager = getKeyManager();
    const validation = await keyManager.validateProviderKey(
      key.provider as LLMProvider,
      decryptedKey
    );

    // Update last used timestamp if successful
    if (validation.valid) {
      await db
        .update(apiKeysTable)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeysTable.id, keyId));
    }

    return NextResponse.json({
      valid: validation.valid,
      error: validation.error,
    });
  } catch (error) {
    console.error('Error validating provider key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
