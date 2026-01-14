/**
 * Credential Validator
 *
 * Utilities for validating and routing provider credentials based on model requirements.
 * Strict matching - each provider needs its own credential, no universal fallbacks.
 */

import type { ApiKeyParadigmConfig, CredentialProvider, ProviderConfig } from './types';

/**
 * Decrypted credential with provider info
 */
export interface DecryptedCredentialInfo {
  provider: string;
  isDefault: boolean;
  decryptedKey: string;
  config?: ProviderConfig;
}

/**
 * Extract provider from model string
 * e.g., "anthropic/claude-3.5-sonnet" → "anthropic"
 * e.g., "openai/gpt-4o" → "openai"
 */
export function extractProviderFromModel(model: string): string {
  const parts = model.split('/');
  if (parts.length < 2) {
    // If no slash, assume it's the provider itself or return as-is
    return model.toLowerCase();
  }
  return parts[0].toLowerCase();
}

/**
 * Find the right credential for a model
 * Strict matching - provider must match exactly, no fallbacks
 *
 * @param model - Model string (e.g., "anthropic/claude-3.5-sonnet")
 * @param credentials - Available decrypted credentials
 * @returns Matching credential or null if none found
 */
export function findCredentialForModel(
  model: string,
  credentials: DecryptedCredentialInfo[]
): { provider: string; apiKey: string; config?: ProviderConfig } | null {
  const targetProvider = extractProviderFromModel(model);

  // Exact provider match only - no fallbacks
  const exactMatch = credentials.find((c) => c.provider === targetProvider);
  if (exactMatch) {
    return {
      provider: exactMatch.provider,
      apiKey: exactMatch.decryptedKey,
      config: exactMatch.config,
    };
  }

  // No fallback - return null if no exact match
  return null;
}

/**
 * Get all unique providers required by a paradigm configuration
 */
export function getRequiredProviders(paradigmConfig: ApiKeyParadigmConfig): Set<string> {
  const providers = new Set<string>();

  for (const [paradigm, config] of Object.entries(paradigmConfig)) {
    if (!config || !config.enabled) continue;

    if (paradigm === 'ensemble' && 'models' in config) {
      // Ensemble has multiple models
      for (const model of config.models) {
        providers.add(extractProviderFromModel(model));
      }
    } else if ('model' in config) {
      // Single model paradigm
      providers.add(extractProviderFromModel(config.model));
    }
  }

  return providers;
}

/**
 * Validate that all paradigms have required credentials
 * Strict validation - each provider needs its own credential
 *
 * @param paradigmConfig - The paradigm configuration to validate
 * @param availableProviders - Set of provider names that have credentials
 * @returns Validation result with missing providers if invalid
 */
export function validateParadigmCredentials(
  paradigmConfig: ApiKeyParadigmConfig,
  availableProviders: Set<string>
): { valid: boolean; missingProviders: string[] } {
  const missingProviders: string[] = [];

  for (const [paradigm, config] of Object.entries(paradigmConfig)) {
    if (!config || !config.enabled) continue;

    if (paradigm === 'ensemble' && 'models' in config) {
      for (const model of config.models) {
        const provider = extractProviderFromModel(model);
        if (!availableProviders.has(provider)) {
          missingProviders.push(provider);
        }
      }
    } else if ('model' in config) {
      const provider = extractProviderFromModel(config.model);
      if (!availableProviders.has(provider)) {
        missingProviders.push(provider);
      }
    }
  }

  return {
    valid: missingProviders.length === 0,
    missingProviders: Array.from(new Set(missingProviders)), // Deduplicate
  };
}

/**
 * Validate that all models in a list of paradigms have available credentials
 *
 * @param paradigms - Resolved paradigms with their models
 * @param credentials - Available decrypted credentials
 * @returns Validation result with missing models if invalid
 */
export function validateResolvedParadigms(
  paradigms: Array<{ paradigm: string; model: string; models?: string[] }>,
  credentials: DecryptedCredentialInfo[]
): { valid: boolean; missingModels: string[] } {
  const missingModels: string[] = [];

  for (const paradigm of paradigms) {
    const models = paradigm.models || [paradigm.model];
    for (const model of models) {
      const cred = findCredentialForModel(model, credentials);
      if (!cred) {
        missingModels.push(model);
      }
    }
  }

  return {
    valid: missingModels.length === 0,
    missingModels: Array.from(new Set(missingModels)),
  };
}

/**
 * Build a map of provider to credential for quick lookups
 */
export function buildCredentialMap(
  credentials: DecryptedCredentialInfo[]
): Map<string, DecryptedCredentialInfo> {
  const map = new Map<string, DecryptedCredentialInfo>();
  for (const cred of credentials) {
    map.set(cred.provider, cred);
  }
  return map;
}
