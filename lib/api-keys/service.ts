/**
 * API Key Service
 *
 * Manages API keys with their verification configurations.
 * Handles creation, retrieval, and config resolution.
 */

import crypto from 'crypto';
import { db } from '@/utils/db/db';
import { apiKeysTable, providerCredentialsTable } from '@/utils/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { decrypt } from '@/lib/llm/key-manager';
import {
  ApiKeyWithConfig,
  ApiKeyParadigmConfig,
  ApiKeyThresholds,
  CreateApiKeyRequest,
  VerifyRequest,
  ResolvedVerificationConfig,
  ResolvedParadigm,
  DEFAULT_THRESHOLDS,
  DEFAULT_MODELS,
  DEFAULT_ENSEMBLE_MODELS,
  CredentialProvider,
  ProviderConfig,
} from './types';
import { createLogger } from '@/lib/logger';

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
 */
export async function createApiKey(
  orgId: string,
  request: CreateApiKeyRequest
): Promise<{ id: string; apiKey: string; prefix: string }> {
  const { key, hash, prefix } = generateApiKey(request.name);

  const [result] = await db
    .insert(apiKeysTable)
    .values({
      orgId,
      name: request.name,
      keyHash: hash,
      keyPrefix: prefix,
      providerCredentialId: request.providerCredentialId,
      paradigmConfig: request.paradigmConfig,
      defaultThresholds: request.defaultThresholds || null,
      expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
      isActive: true,
    })
    .returning({ id: apiKeysTable.id });

  log.info({ orgId, name: request.name }, 'API key created');

  return {
    id: result.id,
    apiKey: key, // Only returned once at creation
    prefix,
  };
}

/**
 * Get an API key by its hash (for authentication)
 */
export async function getApiKeyByHash(keyHash: string): Promise<ApiKeyWithConfig | null> {
  const [key] = await db
    .select({
      id: apiKeysTable.id,
      orgId: apiKeysTable.orgId,
      name: apiKeysTable.name,
      keyPrefix: apiKeysTable.keyPrefix,
      providerCredentialId: apiKeysTable.providerCredentialId,
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
}

/**
 * Get an API key by ID with its provider credential
 */
export async function getApiKeyWithCredential(
  orgId: string,
  keyId: string
): Promise<ApiKeyWithConfig | null> {
  const [key] = await db
    .select({
      id: apiKeysTable.id,
      orgId: apiKeysTable.orgId,
      name: apiKeysTable.name,
      keyPrefix: apiKeysTable.keyPrefix,
      providerCredentialId: apiKeysTable.providerCredentialId,
      paradigmConfig: apiKeysTable.paradigmConfig,
      defaultThresholds: apiKeysTable.defaultThresholds,
      isActive: apiKeysTable.isActive,
      expiresAt: apiKeysTable.expiresAt,
      lastUsedAt: apiKeysTable.lastUsedAt,
      createdAt: apiKeysTable.createdAt,
      updatedAt: apiKeysTable.updatedAt,
      // Provider credential fields
      credentialId: providerCredentialsTable.id,
      credentialName: providerCredentialsTable.name,
      credentialProvider: providerCredentialsTable.provider,
      credentialConfig: providerCredentialsTable.config,
      credentialIsActive: providerCredentialsTable.isActive,
      credentialValidationStatus: providerCredentialsTable.validationStatus,
    })
    .from(apiKeysTable)
    .leftJoin(providerCredentialsTable, eq(apiKeysTable.providerCredentialId, providerCredentialsTable.id))
    .where(
      and(eq(apiKeysTable.id, keyId), eq(apiKeysTable.orgId, orgId), isNull(apiKeysTable.deletedAt))
    )
    .limit(1);

  if (!key) {
    return null;
  }

  return {
    id: key.id,
    orgId: key.orgId,
    name: key.name,
    keyPrefix: key.keyPrefix,
    providerCredentialId: key.providerCredentialId,
    paradigmConfig: key.paradigmConfig as ApiKeyParadigmConfig | null,
    defaultThresholds: key.defaultThresholds as ApiKeyThresholds | null,
    isActive: key.isActive,
    expiresAt: key.expiresAt || undefined,
    lastUsedAt: key.lastUsedAt || undefined,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
    providerCredential: key.credentialId
      ? {
          id: key.credentialId,
          orgId: key.orgId,
          name: key.credentialName!,
          provider: key.credentialProvider as CredentialProvider,
          config: key.credentialConfig as ProviderConfig | undefined,
          isActive: key.credentialIsActive!,
          validationStatus: (key.credentialValidationStatus || 'pending') as 'valid' | 'invalid' | 'pending',
          createdAt: key.createdAt,
          updatedAt: key.updatedAt,
        }
      : undefined,
  };
}

/**
 * List all API keys for an organization
 */
export async function listApiKeys(orgId: string): Promise<ApiKeyWithConfig[]> {
  const keys = await db
    .select({
      id: apiKeysTable.id,
      orgId: apiKeysTable.orgId,
      name: apiKeysTable.name,
      keyPrefix: apiKeysTable.keyPrefix,
      providerCredentialId: apiKeysTable.providerCredentialId,
      paradigmConfig: apiKeysTable.paradigmConfig,
      defaultThresholds: apiKeysTable.defaultThresholds,
      isActive: apiKeysTable.isActive,
      expiresAt: apiKeysTable.expiresAt,
      lastUsedAt: apiKeysTable.lastUsedAt,
      createdAt: apiKeysTable.createdAt,
      updatedAt: apiKeysTable.updatedAt,
      // Provider credential fields
      credentialId: providerCredentialsTable.id,
      credentialName: providerCredentialsTable.name,
      credentialProvider: providerCredentialsTable.provider,
    })
    .from(apiKeysTable)
    .leftJoin(providerCredentialsTable, eq(apiKeysTable.providerCredentialId, providerCredentialsTable.id))
    .where(and(eq(apiKeysTable.orgId, orgId), isNull(apiKeysTable.deletedAt)))
    .orderBy(apiKeysTable.createdAt);

  return keys.map((key) => ({
    id: key.id,
    orgId: key.orgId,
    name: key.name,
    keyPrefix: key.keyPrefix,
    providerCredentialId: key.providerCredentialId,
    paradigmConfig: key.paradigmConfig as ApiKeyParadigmConfig | null,
    defaultThresholds: key.defaultThresholds as ApiKeyThresholds | null,
    isActive: key.isActive,
    expiresAt: key.expiresAt || undefined,
    lastUsedAt: key.lastUsedAt || undefined,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
    providerCredential: key.credentialId
      ? {
          id: key.credentialId,
          orgId: key.orgId,
          name: key.credentialName!,
          provider: key.credentialProvider as CredentialProvider,
          isActive: true,
          validationStatus: 'valid' as const,
          createdAt: key.createdAt,
          updatedAt: key.updatedAt,
        }
      : undefined,
  }));
}

/**
 * Update an API key's configuration
 */
export async function updateApiKey(
  orgId: string,
  keyId: string,
  updates: {
    name?: string;
    providerCredentialId?: string;
    paradigmConfig?: ApiKeyParadigmConfig;
    defaultThresholds?: ApiKeyThresholds;
    isActive?: boolean;
  }
): Promise<boolean> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.providerCredentialId !== undefined)
    updateData.providerCredentialId = updates.providerCredentialId;
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
 * Merges API key defaults with request overrides
 */
export async function resolveVerificationConfig(
  apiKey: ApiKeyWithConfig,
  request: VerifyRequest
): Promise<ResolvedVerificationConfig> {
  // Get the provider credential
  if (!apiKey.providerCredentialId) {
    throw new Error('API key has no provider credential configured');
  }

  // Fetch and decrypt the provider credential
  const [credential] = await db
    .select({
      encryptedCredentials: providerCredentialsTable.encryptedCredentials,
      provider: providerCredentialsTable.provider,
      config: providerCredentialsTable.config,
      isActive: providerCredentialsTable.isActive,
    })
    .from(providerCredentialsTable)
    .where(eq(providerCredentialsTable.id, apiKey.providerCredentialId))
    .limit(1);

  if (!credential || !credential.isActive) {
    throw new Error('Provider credential not found or inactive');
  }

  const decryptedApiKey = decrypt(credential.encryptedCredentials);

  // Resolve paradigms
  const paradigms = resolveParadigms(apiKey.paradigmConfig, request.methods);

  if (paradigms.length === 0) {
    throw new Error('No paradigms configured. At least one paradigm must be enabled.');
  }

  // Resolve thresholds
  const keyThresholds = apiKey.defaultThresholds || {};
  const requestOptions = request.options || {};

  return {
    providerCredentialId: apiKey.providerCredentialId,
    decryptedApiKey,
    provider: credential.provider as CredentialProvider,
    providerConfig: credential.config as ProviderConfig | undefined,
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

  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    return { success: false, error: 'API key has expired' };
  }

  // Update last used (non-blocking)
  updateLastUsed(apiKey.id);

  return { success: true, apiKey };
}
