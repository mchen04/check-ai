/**
 * Provider Credentials Service
 *
 * Manages LLM provider credentials (API keys) stored in the vault.
 * Handles encryption, validation, and retrieval.
 */

import { db } from '@/utils/db/db';
import { providerCredentialsTable, apiKeyCredentialsTable } from '@/utils/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { encrypt, decrypt } from '@/lib/llm/key-manager';
import {
  ProviderCredential,
  CredentialProvider,
  ProviderConfig,
  CreateProviderCredentialRequest,
} from './types';
import { createLogger } from '@/lib/logger';

const log = createLogger('ProviderCredentials');

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Create a new provider credential
 */
export async function createProviderCredential(
  orgId: string,
  request: CreateProviderCredentialRequest
): Promise<{ id: string; name: string }> {
  // Encrypt the API key
  const encryptedCredentials = encrypt(request.apiKey);

  const [result] = await db
    .insert(providerCredentialsTable)
    .values({
      orgId,
      name: request.name,
      provider: request.provider,
      encryptedCredentials,
      config: request.config || null,
      isActive: true,
      validationStatus: 'pending',
    })
    .returning({ id: providerCredentialsTable.id, name: providerCredentialsTable.name });

  log.info({ orgId, name: request.name, provider: request.provider }, 'Provider credential created');

  return result;
}

/**
 * Get a provider credential by ID
 */
export async function getProviderCredential(
  orgId: string,
  credentialId: string
): Promise<ProviderCredential | null> {
  const [credential] = await db
    .select({
      id: providerCredentialsTable.id,
      orgId: providerCredentialsTable.orgId,
      name: providerCredentialsTable.name,
      provider: providerCredentialsTable.provider,
      config: providerCredentialsTable.config,
      isActive: providerCredentialsTable.isActive,
      validationStatus: providerCredentialsTable.validationStatus,
      lastValidatedAt: providerCredentialsTable.lastValidatedAt,
      lastUsedAt: providerCredentialsTable.lastUsedAt,
      createdAt: providerCredentialsTable.createdAt,
      updatedAt: providerCredentialsTable.updatedAt,
    })
    .from(providerCredentialsTable)
    .where(
      and(
        eq(providerCredentialsTable.id, credentialId),
        eq(providerCredentialsTable.orgId, orgId),
        isNull(providerCredentialsTable.deletedAt)
      )
    )
    .limit(1);

  if (!credential) {
    return null;
  }

  return {
    ...credential,
    provider: credential.provider as CredentialProvider,
    config: credential.config as ProviderConfig | undefined,
    validationStatus: (credential.validationStatus || 'pending') as 'valid' | 'invalid' | 'pending',
    lastValidatedAt: credential.lastValidatedAt || undefined,
    lastUsedAt: credential.lastUsedAt || undefined,
  };
}

/**
 * Get decrypted API key for a credential
 */
export async function getDecryptedCredential(
  orgId: string,
  credentialId: string
): Promise<{ apiKey: string; provider: CredentialProvider; config?: ProviderConfig } | null> {
  const [credential] = await db
    .select({
      encryptedCredentials: providerCredentialsTable.encryptedCredentials,
      provider: providerCredentialsTable.provider,
      config: providerCredentialsTable.config,
      isActive: providerCredentialsTable.isActive,
    })
    .from(providerCredentialsTable)
    .where(
      and(
        eq(providerCredentialsTable.id, credentialId),
        eq(providerCredentialsTable.orgId, orgId),
        isNull(providerCredentialsTable.deletedAt)
      )
    )
    .limit(1);

  if (!credential || !credential.isActive) {
    return null;
  }

  try {
    const apiKey = decrypt(credential.encryptedCredentials);

    // Update last used timestamp (non-blocking)
    db.update(providerCredentialsTable)
      .set({ lastUsedAt: new Date() })
      .where(eq(providerCredentialsTable.id, credentialId))
      .execute()
      .catch((err) => log.error({ err }, 'Failed to update credential last used timestamp'));

    return {
      apiKey,
      provider: credential.provider as CredentialProvider,
      config: credential.config as ProviderConfig | undefined,
    };
  } catch (error) {
    log.error({ err: error, credentialId }, 'Failed to decrypt credential');
    return null;
  }
}

/**
 * List all provider credentials for an organization with API key counts
 */
export async function listProviderCredentials(orgId: string): Promise<(ProviderCredential & { apiKeyCount: number })[]> {
  // Subquery to count API keys for each credential (via junction table)
  const apiKeyCountSubquery = db
    .select({
      providerCredentialId: apiKeyCredentialsTable.providerCredentialId,
      count: sql<number>`count(DISTINCT ${apiKeyCredentialsTable.apiKeyId})`.as('count'),
    })
    .from(apiKeyCredentialsTable)
    .groupBy(apiKeyCredentialsTable.providerCredentialId)
    .as('api_key_counts');

  const credentials = await db
    .select({
      id: providerCredentialsTable.id,
      orgId: providerCredentialsTable.orgId,
      name: providerCredentialsTable.name,
      provider: providerCredentialsTable.provider,
      config: providerCredentialsTable.config,
      isActive: providerCredentialsTable.isActive,
      validationStatus: providerCredentialsTable.validationStatus,
      lastValidatedAt: providerCredentialsTable.lastValidatedAt,
      lastUsedAt: providerCredentialsTable.lastUsedAt,
      createdAt: providerCredentialsTable.createdAt,
      updatedAt: providerCredentialsTable.updatedAt,
      apiKeyCount: sql<number>`COALESCE(${apiKeyCountSubquery.count}, 0)`,
    })
    .from(providerCredentialsTable)
    .leftJoin(apiKeyCountSubquery, eq(providerCredentialsTable.id, apiKeyCountSubquery.providerCredentialId))
    .where(and(eq(providerCredentialsTable.orgId, orgId), isNull(providerCredentialsTable.deletedAt)))
    .orderBy(providerCredentialsTable.createdAt);

  return credentials.map((c) => ({
    ...c,
    provider: c.provider as CredentialProvider,
    config: c.config as ProviderConfig | undefined,
    validationStatus: (c.validationStatus || 'pending') as 'valid' | 'invalid' | 'pending',
    lastValidatedAt: c.lastValidatedAt || undefined,
    lastUsedAt: c.lastUsedAt || undefined,
    apiKeyCount: Number(c.apiKeyCount) || 0,
  }));
}

/**
 * Update a provider credential
 */
export async function updateProviderCredential(
  orgId: string,
  credentialId: string,
  updates: {
    name?: string;
    apiKey?: string;
    config?: ProviderConfig;
    isActive?: boolean;
  }
): Promise<boolean> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }
  if (updates.apiKey !== undefined) {
    updateData.encryptedCredentials = encrypt(updates.apiKey);
    updateData.validationStatus = 'pending'; // Re-validate after key change
  }
  if (updates.config !== undefined) {
    updateData.config = updates.config;
  }
  if (updates.isActive !== undefined) {
    updateData.isActive = updates.isActive;
  }

  const result = await db
    .update(providerCredentialsTable)
    .set(updateData)
    .where(
      and(
        eq(providerCredentialsTable.id, credentialId),
        eq(providerCredentialsTable.orgId, orgId),
        isNull(providerCredentialsTable.deletedAt)
      )
    )
    .returning({ id: providerCredentialsTable.id });

  return result.length > 0;
}

/**
 * Soft delete a provider credential
 */
export async function deleteProviderCredential(orgId: string, credentialId: string): Promise<boolean> {
  const result = await db
    .update(providerCredentialsTable)
    .set({
      deletedAt: new Date(),
      isActive: false,
    })
    .where(
      and(
        eq(providerCredentialsTable.id, credentialId),
        eq(providerCredentialsTable.orgId, orgId),
        isNull(providerCredentialsTable.deletedAt)
      )
    )
    .returning({ id: providerCredentialsTable.id });

  return result.length > 0;
}

/**
 * Update validation status after testing the credential
 */
export async function updateValidationStatus(
  credentialId: string,
  status: 'valid' | 'invalid'
): Promise<void> {
  await db
    .update(providerCredentialsTable)
    .set({
      validationStatus: status,
      lastValidatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(providerCredentialsTable.id, credentialId));
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate a provider credential by making a test API call
 */
export async function validateProviderCredential(
  orgId: string,
  credentialId: string
): Promise<{ valid: boolean; error?: string }> {
  const credential = await getDecryptedCredential(orgId, credentialId);

  if (!credential) {
    return { valid: false, error: 'Credential not found' };
  }

  // Import the key manager to use its validation logic
  const { getKeyManager } = await import('@/lib/llm/key-manager');
  const keyManager = getKeyManager();

  const result = await keyManager.validateProviderKey(
    credential.provider as Parameters<typeof keyManager.validateProviderKey>[0],
    credential.apiKey
  );

  // Update the validation status
  await updateValidationStatus(credentialId, result.valid ? 'valid' : 'invalid');

  return result;
}
