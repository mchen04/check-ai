/**
 * API Keys Module Barrel Export
 */

// Types and schemas
export {
  providerEnum,
  type CredentialProvider,
  type ProviderConfig,
  type ProviderCredential,
  type ParadigmConfig,
  type EnsembleConfig,
  type ApiKeyParadigmConfig,
  type ApiKeyThresholds,
  type ApiKeyCredential,
  type ApiKeyWithConfig,
  createProviderCredentialSchema,
  type CreateProviderCredentialRequest,
  updateProviderCredentialSchema,
  type UpdateProviderCredentialRequest,
  createApiKeySchema,
  type CreateApiKeyRequest,
  updateApiKeySchema,
  type UpdateApiKeyRequest,
  type VerifyRequest,
  type ResolvedParadigm,
  type DecryptedCredential,
  type ResolvedVerificationConfig,
  DEFAULT_THRESHOLDS,
  DEFAULT_MODELS,
  DEFAULT_ENSEMBLE_MODELS,
} from './types';

// Provider credentials operations
export {
  createProviderCredential,
  getProviderCredential,
  getDecryptedCredential,
  listProviderCredentials,
  updateProviderCredential,
  deleteProviderCredential,
  updateValidationStatus,
  validateProviderCredential,
} from './provider-credentials';

// API key service operations
export {
  createApiKey,
  getApiKeyByHash,
  getApiKeyWithCredential,
  listApiKeys,
  deleteApiKey,
  updateApiKey,
  updateLastUsed,
  listApiKeyCredentials,
  addCredentialToApiKey,
  removeCredentialFromApiKey,
  setDefaultCredential,
  resolveVerificationConfig,
  authenticateApiKey,
} from './service';
