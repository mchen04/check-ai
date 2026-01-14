/**
 * API Key Service
 *
 * Manages API keys with their verification configurations.
 * Handles creation, retrieval, and config resolution.
 */

import crypto from 'crypto';
import { db, withTransaction, DbOrTx } from '@/utils/db/db';
import { apiKeysTable, providerCredentialsTable, apiKeyCredentialsTable } from '@/utils/db/schema';
import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { decrypt } from '@/lib/llm/key-manager';
import { isDateExpired } from '@/lib/api/formatters';
import {
  ApiKeyWithConfig,
  ApiKeyParadigmConfig,
  ApiKeyThresholds,
  ApiKeyCredential,
  CreateApiKeyRequest,
  VerifyRequest,
  ResolvedVerificationConfig,
  ResolvedParadigm,
  DecryptedCredential,
  DEFAULT_THRESHOLDS,
  DEFAULT_MODELS,
  DEFAULT_ENSEMBLE_MODELS,
  CredentialProvider,
  ProviderConfig,
} from './types';
import {
  validateParadigmCredentials,
  findCredentialForModel,
  DecryptedCredentialInfo,
} from './credential-validator';
import { createLogger } from '@/lib/logger';
import { withQueryTiming } from '@/lib/apm/query-monitor';

const log = createLogger('ApiKeyService');

// =============================================================================
// KEY GENERATION
// =============================================================================

/**
 * Generate a new API key with a meaningful prefix
 */
function generateApiKey(name: string): { key: string; hash: string; prefix: string } {
  // Create a short slug from the name (first 4 chars, alphanumeric only)
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 4)
    .padEnd(4, 'x');

  // Generate random suffix
  const randomBytes = crypto.randomBytes(24).toString('base64url');

  // Full key: vfy_<slug>_<random>
  const key = `vfy_${slug}_${randomBytes}`;

  // Hash for storage
  const hash = crypto.createHash('sha256').update(key).digest('hex');

  // Prefix for display (first 12 chars)
  const prefix = key.slice(0, 12);

  return { key, hash, prefix };
}

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Create a new API key with configuration
 * Uses a transaction to ensure atomicity of key + credential link creation
 */
export async function createApiKey(
  orgId: string,
  request: CreateApiKeyRequest
): Promise<{ id: string; apiKey: string; prefix: string }> {
  return withQueryTiming('createApiKey', 'api_keys', async () => {
    const { key, hash, prefix } = generateApiKey(request.name);

    const credentialIds = request.providerCredentialIds;

    if (credentialIds.length === 0) {
      throw new Error('At least one provider credential is required');
    }

    // Validate credentials exist and belong to org (outside transaction for faster failure)
    const credentials = await db
      .select({ id: providerCredentialsTable.id, provider: providerCredentialsTable.provider })
      .from(providerCredentialsTable)
      .where(
        and(
          eq(providerCredentialsTable.orgId, orgId),
          isNull(providerCredentialsTable.deletedAt),
          inArray(providerCredentialsTable.id, credentialIds)
        )
      );

    if (credentials.length !== credentialIds.length) {
      throw new Error('One or more provider credentials not found');
    }

    // Validate paradigms have required credentials
    if (request.paradigmConfig) {
      const availableProviders = new Set(credentials.map((c) => c.provider));
      const validation = validateParadigmCredentials(request.paradigmConfig, availableProviders);
      if (!validation.valid) {
        throw new Error(`Missing credentials for providers: ${validation.missingProviders.join(', ')}`);
      }
    }

    // Determine default credential
    const defaultCredentialId = request.defaultCredentialId || credentialIds[0];

    // Use transaction for API key + credential links
    const result = await withTransaction(async (tx) => {
      // Insert API key
      const [keyResult] = await tx
        .insert(apiKeysTable)
        .values({
          orgId,
          name: request.name,
          keyHash: hash,
          keyPrefix: prefix,
          paradigmConfig: request.paradigmConfig,
          defaultThresholds: request.defaultThresholds || null,
          expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
          isActive: true,
        })
        .returning({ id: apiKeysTable.id });

      // Insert into junction table
      await tx.insert(apiKeyCredentialsTable).values(
        credentialIds.map((credId) => ({
          apiKeyId: keyResult.id,
          providerCredentialId: credId,
          isDefault: credId === defaultCredentialId,
        }))
      );

      return keyResult;
    });

    log.info({ orgId, name: request.name, credentialCount: credentialIds.length }, 'API key created');

    return {
      id: result.id,
      apiKey: key, // Only returned once at creation
      prefix,
    };
  });
}

/**
 * Get an API key by its hash (for authentication)
 */
export async function getApiKeyByHash(keyHash: string): Promise<ApiKeyWithConfig | null> {
  return withQueryTiming('getApiKeyByHash', 'api_keys', async () => {
    const [key] = await db
      .select({
        id: apiKeysTable.id,
        orgId: apiKeysTable.orgId,
        name: apiKeysTable.name,
        keyPrefix: apiKeysTable.keyPrefix,
        paradigmConfig: apiKeysTable.paradigmConfig,
        defaultThresholds: apiKeysTable.defaultThresholds,
        isActive: apiKeysTable.isActive,
        expiresAt: apiKeysTable.expiresAt,
        lastUsedAt: apiKeysTable.lastUsedAt,
        createdAt: apiKeysTable.createdAt,
        updatedAt: apiKeysTable.updatedAt,
      })
      .from(apiKeysTable)
      .where(and(eq(apiKeysTable.keyHash, keyHash), isNull(apiKeysTable.deletedAt)))
      .limit(1);

    if (!key) {
      return null;
    }

    return {
      ...key,
      paradigmConfig: key.paradigmConfig as ApiKeyParadigmConfig | null,
      defaultThresholds: key.defaultThresholds as ApiKeyThresholds | null,
      expiresAt: key.expiresAt || undefined,
      lastUsedAt: key.lastUsedAt || undefined,
    };
  });
}

/**
 * Get an API key by ID with its provider credentials (from junction table)
 */
export async function getApiKeyWithCredential(
  orgId: string,
  keyId: string
): Promise<ApiKeyWithConfig | null> {
  // Fetch API key
  const [key] = await db
    .select({
      id: apiKeysTable.id,
      orgId: apiKeysTable.orgId,
      name: apiKeysTable.name,
      keyPrefix: apiKeysTable.keyPrefix,
      paradigmConfig: apiKeysTable.paradigmConfig,
      defaultThresholds: apiKeysTable.defaultThresholds,
      isActive: apiKeysTable.isActive,
      expiresAt: apiKeysTable.expiresAt,
      lastUsedAt: apiKeysTable.lastUsedAt,
      createdAt: apiKeysTable.createdAt,
      updatedAt: apiKeysTable.updatedAt,
    })
    .from(apiKeysTable)
    .where(
      and(eq(apiKeysTable.id, keyId), eq(apiKeysTable.orgId, orgId), isNull(apiKeysTable.deletedAt))
    )
    .limit(1);

  if (!key) {
    return null;
  }

  // Fetch all linked credentials from junction table
  const credentialLinks = await db
    .select({
      id: apiKeyCredentialsTable.id,
      providerCredentialId: apiKeyCredentialsTable.providerCredentialId,
      isDefault: apiKeyCredentialsTable.isDefault,
      createdAt: apiKeyCredentialsTable.createdAt,
      credentialName: providerCredentialsTable.name,
      credentialProvider: providerCredentialsTable.provider,
      credentialConfig: providerCredentialsTable.config,
      credentialIsActive: providerCredentialsTable.isActive,
      credentialValidationStatus: providerCredentialsTable.validationStatus,
    })
    .from(apiKeyCredentialsTable)
    .innerJoin(
      providerCredentialsTable,
      eq(apiKeyCredentialsTable.providerCredentialId, providerCredentialsTable.id)
    )
    .where(eq(apiKeyCredentialsTable.apiKeyId, keyId));

  // Build credentials array
  const credentials: ApiKeyCredential[] = credentialLinks.map((c) => ({
    id: c.id,
    apiKeyId: keyId,
    providerCredentialId: c.providerCredentialId,
    isDefault: c.isDefault,
    createdAt: c.createdAt,
    credential: {
      id: c.providerCredentialId,
      orgId: key.orgId,
      name: c.credentialName,
      provider: c.credentialProvider as CredentialProvider,
      config: c.credentialConfig as ProviderConfig | undefined,
      isActive: c.credentialIsActive,
      validationStatus: (c.credentialValidationStatus || 'pending') as 'valid' | 'invalid' | 'pending',
      createdAt: c.createdAt,
      updatedAt: c.createdAt,
    },
  }));

  // Find default credential
  const defaultCred = credentials.find((c) => c.isDefault);

  return {
    id: key.id,
    orgId: key.orgId,
    name: key.name,
    keyPrefix: key.keyPrefix,
    paradigmConfig: key.paradigmConfig as ApiKeyParadigmConfig | null,
    defaultThresholds: key.defaultThresholds as ApiKeyThresholds | null,
    isActive: key.isActive,
    expiresAt: key.expiresAt || undefined,
    lastUsedAt: key.lastUsedAt || undefined,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
    credentials,
    providerCredential: defaultCred?.credential,
  };
}

/**
 * List all API keys for an organization
 */
export async function listApiKeys(orgId: string): Promise<ApiKeyWithConfig[]> {
  return withQueryTiming('listApiKeys', 'api_keys', async () => {
    // Get all keys
    const keys = await db
      .select({
        id: apiKeysTable.id,
        orgId: apiKeysTable.orgId,
        name: apiKeysTable.name,
        keyPrefix: apiKeysTable.keyPrefix,
        paradigmConfig: apiKeysTable.paradigmConfig,
        defaultThresholds: apiKeysTable.defaultThresholds,
        isActive: apiKeysTable.isActive,
        expiresAt: apiKeysTable.expiresAt,
        lastUsedAt: apiKeysTable.lastUsedAt,
        createdAt: apiKeysTable.createdAt,
        updatedAt: apiKeysTable.updatedAt,
      })
      .from(apiKeysTable)
      .where(and(eq(apiKeysTable.orgId, orgId), isNull(apiKeysTable.deletedAt)))
      .orderBy(apiKeysTable.createdAt);

    // Get default credentials for each key via junction table
    const keyIds = keys.map((k) => k.id);
    const defaultCredentials = keyIds.length > 0
      ? await db
          .select({
            apiKeyId: apiKeyCredentialsTable.apiKeyId,
            credentialId: providerCredentialsTable.id,
            credentialName: providerCredentialsTable.name,
            credentialProvider: providerCredentialsTable.provider,
          })
          .from(apiKeyCredentialsTable)
          .innerJoin(
            providerCredentialsTable,
            eq(apiKeyCredentialsTable.providerCredentialId, providerCredentialsTable.id)
          )
          .where(and(
            inArray(apiKeyCredentialsTable.apiKeyId, keyIds),
            eq(apiKeyCredentialsTable.isDefault, true)
          ))
      : [];

    // Build map for quick lookup
    const credMap = new Map(defaultCredentials.map((c) => [c.apiKeyId, c]));

    return keys.map((key) => {
      const cred = credMap.get(key.id);
      return {
        id: key.id,
        orgId: key.orgId,
        name: key.name,
        keyPrefix: key.keyPrefix,
        paradigmConfig: key.paradigmConfig as ApiKeyParadigmConfig | null,
        defaultThresholds: key.defaultThresholds as ApiKeyThresholds | null,
        isActive: key.isActive,
        expiresAt: key.expiresAt || undefined,
        lastUsedAt: key.lastUsedAt || undefined,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
        providerCredential: cred
          ? {
              id: cred.credentialId,
              orgId: key.orgId,
              name: cred.credentialName,
              provider: cred.credentialProvider as CredentialProvider,
              isActive: true,
              validationStatus: 'valid' as const,
              createdAt: key.createdAt,
              updatedAt: key.updatedAt,
            }
          : undefined,
      };
    });
  });
}

/**
 * Update an API key's configuration
 */
export async function updateApiKey(
  orgId: string,
  keyId: string,
  updates: {
    name?: string;
    paradigmConfig?: ApiKeyParadigmConfig;
    defaultThresholds?: ApiKeyThresholds;
    isActive?: boolean;
  }
): Promise<boolean> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.paradigmConfig !== undefined) updateData.paradigmConfig = updates.paradigmConfig;
  if (updates.defaultThresholds !== undefined) updateData.defaultThresholds = updates.defaultThresholds;
  if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

  const result = await db
    .update(apiKeysTable)
    .set(updateData)
    .where(
      and(eq(apiKeysTable.id, keyId), eq(apiKeysTable.orgId, orgId), isNull(apiKeysTable.deletedAt))
    )
    .returning({ id: apiKeysTable.id });

  return result.length > 0;
}

/**
 * Soft delete an API key
 */
export async function deleteApiKey(orgId: string, keyId: string): Promise<boolean> {
  return withQueryTiming('deleteApiKey', 'api_keys', async () => {
    const result = await db
      .update(apiKeysTable)
      .set({
        deletedAt: new Date(),
        isActive: false,
      })
      .where(
        and(eq(apiKeysTable.id, keyId), eq(apiKeysTable.orgId, orgId), isNull(apiKeysTable.deletedAt))
      )
      .returning({ id: apiKeysTable.id });

    return result.length > 0;
  });
}

/**
 * Update last used timestamp
 */
export async function updateLastUsed(keyId: string): Promise<void> {
  await db
    .update(apiKeysTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeysTable.id, keyId))
    .execute()
    .catch((err) => log.error({ err }, 'Failed to update API key last used timestamp'));
}

// =============================================================================
// CONFIG RESOLUTION
// =============================================================================

/**
 * Resolve the full verification configuration for a request
 * Fetches all credentials from junction table, merges API key defaults with request overrides
 */
export async function resolveVerificationConfig(
  apiKey: ApiKeyWithConfig,
  request: VerifyRequest
): Promise<ResolvedVerificationConfig> {
  // Fetch all linked credentials from junction table
  const credentialLinks = await db
    .select({
      providerCredentialId: apiKeyCredentialsTable.providerCredentialId,
      isDefault: apiKeyCredentialsTable.isDefault,
      encryptedCredentials: providerCredentialsTable.encryptedCredentials,
      provider: providerCredentialsTable.provider,
      config: providerCredentialsTable.config,
      isActive: providerCredentialsTable.isActive,
    })
    .from(apiKeyCredentialsTable)
    .innerJoin(
      providerCredentialsTable,
      eq(apiKeyCredentialsTable.providerCredentialId, providerCredentialsTable.id)
    )
    .where(eq(apiKeyCredentialsTable.apiKeyId, apiKey.id));

  if (credentialLinks.length === 0) {
    throw new Error('API key has no provider credentials configured');
  }

  // Decrypt all active credentials
  const decryptedCredentials: DecryptedCredentialInfo[] = credentialLinks
    .filter((c) => c.isActive)
    .map((c) => ({
      provider: c.provider,
      isDefault: c.isDefault,
      decryptedKey: decrypt(c.encryptedCredentials),
      config: c.config as ProviderConfig | undefined,
    }));

  if (decryptedCredentials.length === 0) {
    throw new Error('All provider credentials are inactive');
  }

  // Build credentials map keyed by provider
  const credentialsMap = new Map<string, DecryptedCredential>();
  for (const cred of decryptedCredentials) {
    credentialsMap.set(cred.provider, {
      provider: cred.provider as CredentialProvider,
      apiKey: cred.decryptedKey,
      config: cred.config,
      isDefault: cred.isDefault,
    });
  }

  // Find default credential
  const defaultCred = decryptedCredentials.find((c) => c.isDefault) || decryptedCredentials[0];

  // Resolve paradigms
  const paradigms = resolveParadigms(apiKey.paradigmConfig, request.methods);

  if (paradigms.length === 0) {
    throw new Error('No paradigms configured. At least one paradigm must be enabled.');
  }

  // Validate each paradigm has a usable credential
  for (const paradigm of paradigms) {
    const models = paradigm.models || [paradigm.model];
    for (const model of models) {
      const cred = findCredentialForModel(model, decryptedCredentials);
      if (!cred) {
        throw new Error(`No credential available for model: ${model}`);
      }
    }
  }

  // Resolve thresholds
  const keyThresholds = apiKey.defaultThresholds || {};
  const requestOptions = request.options || {};

  return {
    // Multiple credentials
    credentials: credentialsMap,
    defaultCredential: {
      provider: defaultCred.provider as CredentialProvider,
      apiKey: defaultCred.decryptedKey,
      config: defaultCred.config,
      isDefault: true,
    },
    // Paradigms and thresholds
    paradigms,
    acceptThreshold: requestOptions.acceptThreshold ?? keyThresholds.acceptThreshold ?? DEFAULT_THRESHOLDS.acceptThreshold,
    escalateThreshold: requestOptions.escalateThreshold ?? keyThresholds.escalateThreshold ?? DEFAULT_THRESHOLDS.escalateThreshold,
    timeout: requestOptions.timeout ?? keyThresholds.timeout ?? DEFAULT_THRESHOLDS.timeout,
    maxRetries: requestOptions.maxRetries ?? DEFAULT_THRESHOLDS.maxRetries,
    minConfidence: requestOptions.minConfidence,
    retryOnLowConfidence: requestOptions.retryOnLowConfidence ?? DEFAULT_THRESHOLDS.retryOnLowConfidence,
  };
}

/**
 * Resolve which paradigms to run with their configurations
 */
function resolveParadigms(
  keyConfig: ApiKeyParadigmConfig | null,
  requestMethods?: Record<string, number | { weight: number; model?: string }>
): ResolvedParadigm[] {
  const paradigms: ResolvedParadigm[] = [];

  // If request specifies methods, use those (override key defaults)
  if (requestMethods && Object.keys(requestMethods).length > 0) {
    for (const [paradigm, config] of Object.entries(requestMethods)) {
      if (config === 0) continue; // Skip if weight is 0

      const weight = typeof config === 'number' ? config : config.weight;
      if (weight <= 0) continue;

      // Get model from request, key config, or default
      let model: string;
      let models: string[] | undefined;

      if (typeof config === 'object' && config.model) {
        model = config.model;
      } else if (keyConfig && paradigm in keyConfig) {
        const keyParadigm = keyConfig[paradigm as keyof ApiKeyParadigmConfig];
        if (paradigm === 'ensemble' && keyParadigm && 'models' in keyParadigm) {
          models = keyParadigm.models;
          model = 'ensemble';
        } else if (keyParadigm && 'model' in keyParadigm) {
          model = keyParadigm.model;
        } else {
          model = DEFAULT_MODELS[paradigm] || DEFAULT_MODELS.reasoning;
        }
      } else {
        model = DEFAULT_MODELS[paradigm] || DEFAULT_MODELS.reasoning;
        if (paradigm === 'ensemble') {
          models = DEFAULT_ENSEMBLE_MODELS;
        }
      }

      paradigms.push({ paradigm, weight, model, models });
    }
  }
  // Otherwise, use key's enabled paradigms
  else if (keyConfig) {
    for (const [paradigm, config] of Object.entries(keyConfig)) {
      if (!config || !config.enabled || config.weight <= 0) continue;

      if (paradigm === 'ensemble' && 'models' in config) {
        paradigms.push({
          paradigm,
          weight: config.weight,
          model: 'ensemble',
          models: config.models,
        });
      } else if ('model' in config) {
        paradigms.push({
          paradigm,
          weight: config.weight,
          model: config.model,
        });
      }
    }
  }

  return paradigms;
}

// =============================================================================
// CREDENTIAL MANAGEMENT
// =============================================================================

/**
 * Add a credential to an API key
 */
export async function addCredentialToApiKey(
  orgId: string,
  apiKeyId: string,
  credentialId: string,
  setAsDefault: boolean = false
): Promise<{ success: boolean; error?: string }> {
  // Verify API key ownership
  const [apiKey] = await db
    .select({ id: apiKeysTable.id })
    .from(apiKeysTable)
    .where(
      and(eq(apiKeysTable.id, apiKeyId), eq(apiKeysTable.orgId, orgId), isNull(apiKeysTable.deletedAt))
    );

  if (!apiKey) {
    return { success: false, error: 'API key not found' };
  }

  // Verify credential ownership
  const [credential] = await db
    .select({ id: providerCredentialsTable.id })
    .from(providerCredentialsTable)
    .where(
      and(
        eq(providerCredentialsTable.id, credentialId),
        eq(providerCredentialsTable.orgId, orgId),
        isNull(providerCredentialsTable.deletedAt)
      )
    );

  if (!credential) {
    return { success: false, error: 'Provider credential not found' };
  }

  // If setting as default, unset existing default
  if (setAsDefault) {
    await db
      .update(apiKeyCredentialsTable)
      .set({ isDefault: false })
      .where(
        and(eq(apiKeyCredentialsTable.apiKeyId, apiKeyId), eq(apiKeyCredentialsTable.isDefault, true))
      );
  }

  // Check if this is the first credential (should be default)
  const existingCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(apiKeyCredentialsTable)
    .where(eq(apiKeyCredentialsTable.apiKeyId, apiKeyId));

  const isFirstCredential = Number(existingCount[0].count) === 0;
  const shouldBeDefault = setAsDefault || isFirstCredential;

  // Insert (or update if duplicate)
  try {
    await db.insert(apiKeyCredentialsTable).values({
      apiKeyId,
      providerCredentialId: credentialId,
      isDefault: shouldBeDefault,
    });
  } catch (err: unknown) {
    // Check for unique constraint violation
    if (err instanceof Error && err.message.includes('unique')) {
      return { success: false, error: 'Credential already attached to this API key' };
    }
    throw err;
  }

  log.info({ apiKeyId, credentialId, isDefault: shouldBeDefault }, 'Credential added to API key');
  return { success: true };
}

/**
 * Remove a credential from an API key
 */
export async function removeCredentialFromApiKey(
  orgId: string,
  apiKeyId: string,
  credentialId: string
): Promise<{ success: boolean; error?: string }> {
  // Verify API key ownership
  const [apiKey] = await db
    .select({ id: apiKeysTable.id })
    .from(apiKeysTable)
    .where(
      and(eq(apiKeysTable.id, apiKeyId), eq(apiKeysTable.orgId, orgId), isNull(apiKeysTable.deletedAt))
    );

  if (!apiKey) {
    return { success: false, error: 'API key not found' };
  }

  // Count remaining credentials
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(apiKeyCredentialsTable)
    .where(eq(apiKeyCredentialsTable.apiKeyId, apiKeyId));

  if (Number(countResult[0].count) <= 1) {
    return { success: false, error: 'Cannot remove last credential. API key must have at least one credential.' };
  }

  // Check if removing default
  const [link] = await db
    .select({ isDefault: apiKeyCredentialsTable.isDefault })
    .from(apiKeyCredentialsTable)
    .where(
      and(
        eq(apiKeyCredentialsTable.apiKeyId, apiKeyId),
        eq(apiKeyCredentialsTable.providerCredentialId, credentialId)
      )
    );

  if (!link) {
    return { success: false, error: 'Credential not attached to this API key' };
  }

  // Delete the link
  await db
    .delete(apiKeyCredentialsTable)
    .where(
      and(
        eq(apiKeyCredentialsTable.apiKeyId, apiKeyId),
        eq(apiKeyCredentialsTable.providerCredentialId, credentialId)
      )
    );

  // If we removed the default, promote another
  if (link.isDefault) {
    const [nextCredential] = await db
      .select({ id: apiKeyCredentialsTable.id, providerCredentialId: apiKeyCredentialsTable.providerCredentialId })
      .from(apiKeyCredentialsTable)
      .where(eq(apiKeyCredentialsTable.apiKeyId, apiKeyId))
      .limit(1);

    if (nextCredential) {
      await db
        .update(apiKeyCredentialsTable)
        .set({ isDefault: true })
        .where(eq(apiKeyCredentialsTable.id, nextCredential.id));
    }
  }

  log.info({ apiKeyId, credentialId }, 'Credential removed from API key');
  return { success: true };
}

/**
 * Set a credential as default for an API key
 */
export async function setDefaultCredential(
  orgId: string,
  apiKeyId: string,
  credentialId: string
): Promise<{ success: boolean; error?: string }> {
  // Verify API key ownership
  const [apiKey] = await db
    .select({ id: apiKeysTable.id })
    .from(apiKeysTable)
    .where(
      and(eq(apiKeysTable.id, apiKeyId), eq(apiKeysTable.orgId, orgId), isNull(apiKeysTable.deletedAt))
    );

  if (!apiKey) {
    return { success: false, error: 'API key not found' };
  }

  // Verify the credential is attached to this API key
  const [link] = await db
    .select({ id: apiKeyCredentialsTable.id })
    .from(apiKeyCredentialsTable)
    .where(
      and(
        eq(apiKeyCredentialsTable.apiKeyId, apiKeyId),
        eq(apiKeyCredentialsTable.providerCredentialId, credentialId)
      )
    );

  if (!link) {
    return { success: false, error: 'Credential not attached to this API key' };
  }

  // Unset existing default
  await db
    .update(apiKeyCredentialsTable)
    .set({ isDefault: false })
    .where(eq(apiKeyCredentialsTable.apiKeyId, apiKeyId));

  // Set new default
  await db
    .update(apiKeyCredentialsTable)
    .set({ isDefault: true })
    .where(eq(apiKeyCredentialsTable.id, link.id));

  log.info({ apiKeyId, credentialId }, 'Default credential updated');
  return { success: true };
}

/**
 * List all credentials for an API key
 */
export async function listApiKeyCredentials(
  orgId: string,
  apiKeyId: string
): Promise<ApiKeyCredential[]> {
  // Verify API key ownership
  const [apiKey] = await db
    .select({ id: apiKeysTable.id })
    .from(apiKeysTable)
    .where(
      and(eq(apiKeysTable.id, apiKeyId), eq(apiKeysTable.orgId, orgId), isNull(apiKeysTable.deletedAt))
    );

  if (!apiKey) {
    return [];
  }

  const links = await db
    .select({
      id: apiKeyCredentialsTable.id,
      providerCredentialId: apiKeyCredentialsTable.providerCredentialId,
      isDefault: apiKeyCredentialsTable.isDefault,
      createdAt: apiKeyCredentialsTable.createdAt,
      credentialName: providerCredentialsTable.name,
      credentialProvider: providerCredentialsTable.provider,
      credentialConfig: providerCredentialsTable.config,
      credentialIsActive: providerCredentialsTable.isActive,
      credentialValidationStatus: providerCredentialsTable.validationStatus,
    })
    .from(apiKeyCredentialsTable)
    .innerJoin(
      providerCredentialsTable,
      eq(apiKeyCredentialsTable.providerCredentialId, providerCredentialsTable.id)
    )
    .where(eq(apiKeyCredentialsTable.apiKeyId, apiKeyId));

  return links.map((c) => ({
    id: c.id,
    apiKeyId,
    providerCredentialId: c.providerCredentialId,
    isDefault: c.isDefault,
    createdAt: c.createdAt,
    credential: {
      id: c.providerCredentialId,
      orgId,
      name: c.credentialName,
      provider: c.credentialProvider as CredentialProvider,
      config: c.credentialConfig as ProviderConfig | undefined,
      isActive: c.credentialIsActive,
      validationStatus: (c.credentialValidationStatus || 'pending') as 'valid' | 'invalid' | 'pending',
      createdAt: c.createdAt,
      updatedAt: c.createdAt,
    },
  }));
}

// =============================================================================
// AUTHENTICATION
// =============================================================================

/**
 * Authenticate an API request and return the key with config
 */
export async function authenticateApiKey(
  authHeader: string | null
): Promise<{ success: false; error: string } | { success: true; apiKey: ApiKeyWithConfig }> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid Authorization header' };
  }

  const key = authHeader.substring(7);
  if (!key || key.length < 20) {
    return { success: false, error: 'Invalid API key format' };
  }

  const keyHash = crypto.createHash('sha256').update(key).digest('hex');
  const apiKey = await getApiKeyByHash(keyHash);

  if (!apiKey) {
    return { success: false, error: 'Invalid API key' };
  }

  if (!apiKey.isActive) {
    return { success: false, error: 'API key is inactive' };
  }

  if (isDateExpired(apiKey.expiresAt)) {
    return { success: false, error: 'API key has expired' };
  }

  // Update last used (non-blocking)
  updateLastUsed(apiKey.id);

  return { success: true, apiKey };
}
