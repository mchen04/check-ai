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
 * e.g., "anthropic/claude-sonnet-4.5" → "anthropic"
 * e.g., "openai/gpt-4.1" → "openai"
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
 * Universal gateway providers that can route to any model
 */
const UNIVERSAL_GATEWAYS = ['openrouter'] as const;

/**
 * Find the right credential for a model
 * Checks for exact provider match first, then falls back to universal gateways
 *
 * @param model - Model string (e.g., "anthropic/claude-sonnet-4.5")
 * @param credentials - Available decrypted credentials
 * @returns Matching credential or null if none found
 */
export function findCredentialForModel(
  model: string,
  credentials: DecryptedCredentialInfo[]
): { provider: string; apiKey: string; config?: ProviderConfig } | null {
  const targetProvider = extractProviderFromModel(model);

  // First try exact provider match
  const exactMatch = credentials.find((c) => c.provider === targetProvider);
  if (exactMatch) {
    return {
      provider: exactMatch.provider,
      apiKey: exactMatch.decryptedKey,
      config: exactMatch.config,
    };
  }

  // Fall back to universal gateways (e.g., OpenRouter can route any model)
  const gatewayMatch = credentials.find((c) => UNIVERSAL_GATEWAYS.includes(c.provider as typeof UNIVERSAL_GATEWAYS[number]));
  if (gatewayMatch) {
    return {
      provider: gatewayMatch.provider,
      apiKey: gatewayMatch.decryptedKey,
      config: gatewayMatch.config,
    };
  }

  // No match found
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
 * Check if a provider has a credential available (directly or via gateway)
 */
function hasCredentialForProvider(provider: string, availableProviders: Set<string>): boolean {
  // Direct match
  if (availableProviders.has(provider)) {
    return true;
  }
  // Check if any universal gateway is available
  return UNIVERSAL_GATEWAYS.some((gateway) => availableProviders.has(gateway));
}

/**
 * Validate that all paradigms have required credentials
 * Allows universal gateways (like OpenRouter) to satisfy any provider requirement
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
        if (!hasCredentialForProvider(provider, availableProviders)) {
          missingProviders.push(provider);
        }
      }
    } else if ('model' in config) {
      const provider = extractProviderFromModel(config.model);
      if (!hasCredentialForProvider(provider, availableProviders)) {
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
