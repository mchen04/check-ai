/**
 * API Keys Repository
 * Database operations for API key management
 */

import { db } from '@/utils/db/db';
import { apiKeysTable } from '@/utils/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// =============================================================================
// TYPES
// =============================================================================

export interface ApiKeyRecord {
  id: string;
  orgId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  provider: string;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface ApiKeyListItem {
  id: string;
  name: string;
  keyPrefix: string;
  provider: string;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface CreateApiKeyInput {
  orgId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  provider?: string;
  expiresAt?: Date | null;
}

// =============================================================================
// REPOSITORY FUNCTIONS
// =============================================================================

/**
 * List API keys for an organization
 */
export async function listApiKeys(
  orgId: string,
  limit: number = 50
): Promise<ApiKeyListItem[]> {
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
    .where(eq(apiKeysTable.orgId, orgId))
    .orderBy(desc(apiKeysTable.createdAt))
    .limit(limit);

  return keys;
}

/**
 * Get API key by ID and org
 */
export async function getApiKey(
  id: string,
  orgId: string
): Promise<ApiKeyRecord | null> {
  const [key] = await db
    .select()
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.orgId, orgId)))
    .limit(1);

  return key || null;
}

/**
 * Find API key by hash and prefix (for authentication)
 */
export async function findByHashAndPrefix(
  keyHash: string,
  keyPrefix: string
): Promise<ApiKeyRecord | null> {
  const [key] = await db
    .select()
    .from(apiKeysTable)
    .where(
      and(
        eq(apiKeysTable.keyHash, keyHash),
        eq(apiKeysTable.keyPrefix, keyPrefix),
        eq(apiKeysTable.isActive, true)
      )
    )
    .limit(1);

  return key || null;
}

/**
 * Create a new API key
 */
export async function createApiKey(
  input: CreateApiKeyInput
): Promise<ApiKeyRecord> {
  const [key] = await db
    .insert(apiKeysTable)
    .values({
      orgId: input.orgId,
      name: input.name,
      keyHash: input.keyHash,
      keyPrefix: input.keyPrefix,
      provider: input.provider || 'platform',
      isActive: true,
      expiresAt: input.expiresAt || null,
    })
    .returning();

  return key;
}

/**
 * Deactivate an API key (soft delete)
 */
export async function deactivateApiKey(
  id: string,
  orgId: string
): Promise<boolean> {
  const result = await db
    .update(apiKeysTable)
    .set({ isActive: false })
    .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.orgId, orgId)))
    .returning({ id: apiKeysTable.id });

  return result.length > 0;
}

/**
 * Update last used timestamp
 */
export async function updateLastUsed(id: string): Promise<void> {
  await db
    .update(apiKeysTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeysTable.id, id));
}

/**
 * Check if key is expired
 */
export function isKeyExpired(key: ApiKeyRecord): boolean {
  if (!key.expiresAt) return false;
  return new Date() > key.expiresAt;
}
