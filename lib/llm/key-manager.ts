/**
 * API Key Manager
 * Handles secure storage and retrieval of BYOK (Bring Your Own Key) API keys
 * Uses AES-256-GCM encryption for storing provider API keys
 */

import crypto from 'crypto';
import { db } from '@/utils/db/db';
import { apiKeysTable, organizationsTable } from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';
import { ProviderKeys, LLMProvider, PROVIDER_BASE_URLS } from './types';

// =============================================================================
// ENCRYPTION CONFIGURATION
// =============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  // Derive a 32-byte key from the provided key using SHA-256
  return crypto.createHash('sha256').update(key).digest();
}

// =============================================================================
// ENCRYPTION FUNCTIONS
// =============================================================================

/**
 * Encrypt a string value using AES-256-GCM
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine IV + AuthTag + Encrypted data
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string value encrypted with AES-256-GCM
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// =============================================================================
// API KEY HASHING
// =============================================================================

/**
 * Generate a secure hash of an API key for storage
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Generate a prefix for API key identification
 */
export function generateKeyPrefix(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'vfy_';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a new platform API key
 */
export function generatePlatformApiKey(): string {
  const prefix = generateKeyPrefix();
  const secret = crypto.randomBytes(24).toString('base64url');
  return `${prefix}${secret}`;
}

// =============================================================================
// KEY MANAGER CLASS
// =============================================================================

export class KeyManager {
  /**
   * Get all provider keys for an organization (BYOK + fallback to platform)
   */
  async getProviderKeys(orgId: string): Promise<ProviderKeys> {
    // Fetch all active BYOK keys for the organization
    const keys = await db
      .select({
        provider: apiKeysTable.provider,
        encryptedKey: apiKeysTable.encryptedKey,
      })
      .from(apiKeysTable)
      .where(and(eq(apiKeysTable.orgId, orgId), eq(apiKeysTable.isActive, true)));

    const result: ProviderKeys = {};

    // Decrypt and set BYOK keys
    for (const key of keys) {
      if (key.encryptedKey && key.provider !== 'platform') {
        try {
          const decryptedKey = decrypt(key.encryptedKey);
          result[key.provider as keyof ProviderKeys] = decryptedKey;
        } catch (error) {
          console.error(`Failed to decrypt key for provider ${key.provider}:`, error);
        }
      }
    }

    // Fall back to platform keys from environment for providers without BYOK
    // Tier 1: First-party providers
    if (!result.openai) result.openai = process.env.OPENAI_API_KEY;
    if (!result.anthropic) result.anthropic = process.env.ANTHROPIC_API_KEY;
    if (!result.google) result.google = process.env.GOOGLE_API_KEY;
    if (!result.xai) result.xai = process.env.XAI_API_KEY;
    if (!result.mistral) result.mistral = process.env.MISTRAL_API_KEY;
    if (!result.cohere) result.cohere = process.env.COHERE_API_KEY;
    if (!result.deepseek) result.deepseek = process.env.DEEPSEEK_API_KEY;

    // Tier 3: Inference providers
    if (!result.groq) result.groq = process.env.GROQ_API_KEY;
    if (!result.together) result.together = process.env.TOGETHER_API_KEY;
    if (!result.fireworks) result.fireworks = process.env.FIREWORKS_API_KEY;
    if (!result.cerebras) result.cerebras = process.env.CEREBRAS_API_KEY;
    if (!result.perplexity) result.perplexity = process.env.PERPLEXITY_API_KEY;

    // Tier 4: Unified gateways
    if (!result.openrouter) result.openrouter = process.env.OPENROUTER_API_KEY;
    if (!result.replicate) result.replicate = process.env.REPLICATE_API_TOKEN;

    return result;
  }

  /**
   * Store a BYOK provider key for an organization
   */
  async storeProviderKey(
    orgId: string,
    provider: LLMProvider,
    apiKey: string,
    name?: string
  ): Promise<{ id: string; keyPrefix: string }> {
    const encryptedKey = encrypt(apiKey);
    const keyPrefix = `${provider}_${generateKeyPrefix().slice(4)}`;
    const keyHash = hashApiKey(apiKey);

    const [result] = await db
      .insert(apiKeysTable)
      .values({
        orgId,
        name: name || `${provider} API Key`,
        keyHash,
        keyPrefix,
        provider,
        encryptedKey,
        isActive: true,
      })
      .returning({ id: apiKeysTable.id, keyPrefix: apiKeysTable.keyPrefix });

    return result;
  }

  /**
   * Create a new platform API key for an organization
   */
  async createPlatformApiKey(
    orgId: string,
    name?: string,
    expiresAt?: Date
  ): Promise<{ id: string; apiKey: string; keyPrefix: string }> {
    const apiKey = generatePlatformApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = apiKey.slice(0, 12); // vfy_XXXXXXXX

    const [result] = await db
      .insert(apiKeysTable)
      .values({
        orgId,
        name: name || 'Platform API Key',
        keyHash,
        keyPrefix,
        provider: 'platform',
        isActive: true,
        expiresAt,
      })
      .returning({ id: apiKeysTable.id });

    return {
      id: result.id,
      apiKey,
      keyPrefix,
    };
  }

  /**
   * Validate a platform API key and return the organization
   */
  async validatePlatformApiKey(
    apiKey: string
  ): Promise<{ valid: boolean; orgId?: string; keyId?: string; error?: string }> {
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = apiKey.slice(0, 12);

    const [keyRecord] = await db
      .select({
        id: apiKeysTable.id,
        orgId: apiKeysTable.orgId,
        isActive: apiKeysTable.isActive,
        expiresAt: apiKeysTable.expiresAt,
      })
      .from(apiKeysTable)
      .where(
        and(
          eq(apiKeysTable.keyHash, keyHash),
          eq(apiKeysTable.keyPrefix, keyPrefix),
          eq(apiKeysTable.provider, 'platform')
        )
      )
      .limit(1);

    if (!keyRecord) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (!keyRecord.isActive) {
      return { valid: false, error: 'API key is inactive' };
    }

    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      return { valid: false, error: 'API key has expired' };
    }

    // Update last used timestamp (fire and forget)
    db.update(apiKeysTable)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeysTable.id, keyRecord.id))
      .execute()
      .catch(console.error);

    return {
      valid: true,
      orgId: keyRecord.orgId,
      keyId: keyRecord.id,
    };
  }

  /**
   * Revoke/deactivate an API key
   */
  async revokeApiKey(keyId: string): Promise<void> {
    await db.update(apiKeysTable).set({ isActive: false }).where(eq(apiKeysTable.id, keyId));
  }

  /**
   * Delete an API key permanently
   */
  async deleteApiKey(keyId: string): Promise<void> {
    await db.delete(apiKeysTable).where(eq(apiKeysTable.id, keyId));
  }

  /**
   * List all API keys for an organization (without exposing the actual keys)
   */
  async listApiKeys(orgId: string): Promise<
    Array<{
      id: string;
      name: string;
      provider: string | null;
      keyPrefix: string;
      isActive: boolean;
      lastUsedAt: Date | null;
      createdAt: Date;
      expiresAt: Date | null;
    }>
  > {
    const keys = await db
      .select({
        id: apiKeysTable.id,
        name: apiKeysTable.name,
        provider: apiKeysTable.provider,
        keyPrefix: apiKeysTable.keyPrefix,
        isActive: apiKeysTable.isActive,
        lastUsedAt: apiKeysTable.lastUsedAt,
        createdAt: apiKeysTable.createdAt,
        expiresAt: apiKeysTable.expiresAt,
      })
      .from(apiKeysTable)
      .where(eq(apiKeysTable.orgId, orgId))
      .orderBy(apiKeysTable.createdAt);

    return keys;
  }

  /**
   * Validate a provider API key by making a test call
   */
  async validateProviderKey(
    provider: LLMProvider,
    apiKey: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      switch (provider) {
        // ===========================================
        // Tier 1: First-party providers
        // ===========================================
        case 'openai': {
          const { OpenAI } = await import('openai');
          const client = new OpenAI({ apiKey });
          await client.models.list();
          return { valid: true };
        }
        case 'anthropic': {
          const { default: Anthropic } = await import('@anthropic-ai/sdk');
          const client = new Anthropic({ apiKey });
          // Make a minimal request to validate the key
          await client.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'test' }],
          });
          return { valid: true };
        }
        case 'google': {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
          );
          if (!response.ok) {
            return { valid: false, error: 'Invalid Google API key' };
          }
          return { valid: true };
        }
        case 'xai': {
          const response = await fetch('https://api.x.ai/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!response.ok) {
            return { valid: false, error: 'Invalid xAI/Grok API key' };
          }
          return { valid: true };
        }
        case 'mistral': {
          const response = await fetch('https://api.mistral.ai/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!response.ok) {
            return { valid: false, error: 'Invalid Mistral API key' };
          }
          return { valid: true };
        }
        case 'cohere': {
          const response = await fetch('https://api.cohere.ai/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!response.ok) {
            return { valid: false, error: 'Invalid Cohere API key' };
          }
          return { valid: true };
        }
        case 'deepseek': {
          const response = await fetch('https://api.deepseek.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!response.ok) {
            return { valid: false, error: 'Invalid DeepSeek API key' };
          }
          return { valid: true };
        }

        // ===========================================
        // Tier 2: Cloud providers (enterprise)
        // Azure and Bedrock require config objects, not just API keys
        // ===========================================
        case 'azure':
          return {
            valid: false,
            error: 'Azure OpenAI requires configuration object with endpoint and deploymentId. Use validateAzureConfig() instead.',
          };
        case 'bedrock':
          return {
            valid: false,
            error: 'AWS Bedrock requires AWS credentials. Use validateBedrockConfig() instead.',
          };

        // ===========================================
        // Tier 3: Inference providers
        // ===========================================
        case 'groq': {
          const response = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!response.ok) {
            return { valid: false, error: 'Invalid Groq API key' };
          }
          return { valid: true };
        }
        case 'together': {
          const response = await fetch('https://api.together.xyz/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!response.ok) {
            return { valid: false, error: 'Invalid Together AI API key' };
          }
          return { valid: true };
        }
        case 'fireworks': {
          const response = await fetch('https://api.fireworks.ai/inference/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!response.ok) {
            return { valid: false, error: 'Invalid Fireworks AI API key' };
          }
          return { valid: true };
        }
        case 'cerebras': {
          const response = await fetch('https://api.cerebras.ai/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!response.ok) {
            return { valid: false, error: 'Invalid Cerebras API key' };
          }
          return { valid: true };
        }
        case 'perplexity': {
          // Perplexity doesn't have a models endpoint, so we make a minimal chat request
          const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'sonar',
              messages: [{ role: 'user', content: 'test' }],
              max_tokens: 1,
            }),
          });
          if (!response.ok) {
            const errorText = await response.text();
            if (errorText.includes('Invalid API Key') || response.status === 401) {
              return { valid: false, error: 'Invalid Perplexity API key' };
            }
            // Other errors might be due to rate limits or model issues, not key validity
            return { valid: true };
          }
          return { valid: true };
        }

        // ===========================================
        // Tier 4: Unified gateways
        // ===========================================
        case 'openrouter': {
          const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!response.ok) {
            return { valid: false, error: 'Invalid OpenRouter API key' };
          }
          return { valid: true };
        }
        case 'replicate': {
          const response = await fetch('https://api.replicate.com/v1/account', {
            headers: { Authorization: `Token ${apiKey}` },
          });
          if (!response.ok) {
            return { valid: false, error: 'Invalid Replicate API token' };
          }
          return { valid: true };
        }

        default:
          return { valid: false, error: `Unsupported provider: ${provider}` };
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  /**
   * Validate Azure OpenAI configuration
   */
  async validateAzureConfig(config: {
    apiKey: string;
    endpoint: string;
    deploymentId: string;
    apiVersion?: string;
  }): Promise<{ valid: boolean; error?: string }> {
    try {
      const apiVersion = config.apiVersion || '2024-10-21';
      // Use /openai/models endpoint (not deployment-specific) for validation
      const url = `${config.endpoint}/openai/models?api-version=${apiVersion}`;

      const response = await fetch(url, {
        headers: { 'api-key': config.apiKey },
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 401) {
          return { valid: false, error: 'Invalid Azure OpenAI API key' };
        }
        if (status === 404) {
          return { valid: false, error: 'Invalid Azure deployment or endpoint' };
        }
        return { valid: false, error: `Azure validation failed: ${response.statusText}` };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Azure validation failed',
      };
    }
  }

  /**
   * Validate AWS Bedrock configuration
   */
  async validateBedrockConfig(config: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    sessionToken?: string;
  }): Promise<{ valid: boolean; error?: string }> {
    try {
      const { BedrockClient, ListFoundationModelsCommand } = await import('@aws-sdk/client-bedrock');

      const client = new BedrockClient({
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
          sessionToken: config.sessionToken,
        },
      });

      await client.send(new ListFoundationModelsCommand({}));
      return { valid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bedrock validation failed';

      if (errorMessage.includes('credentials') || errorMessage.includes('UnrecognizedClientException')) {
        return { valid: false, error: 'Invalid AWS credentials' };
      }
      if (errorMessage.includes('region')) {
        return { valid: false, error: 'Invalid AWS region' };
      }

      return { valid: false, error: errorMessage };
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let keyManagerInstance: KeyManager | null = null;

export function getKeyManager(): KeyManager {
  if (!keyManagerInstance) {
    keyManagerInstance = new KeyManager();
  }
  return keyManagerInstance;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Get decrypted API keys for an organization
 * Convenience wrapper around KeyManager.getProviderKeys
 */
export async function getDecryptedApiKeys(orgId: string): Promise<ProviderKeys> {
  const manager = getKeyManager();
  return manager.getProviderKeys(orgId);
}
