/**
 * Verification Module Index
 * Main exports for the verification system
 */

// Core orchestrator
export {
  VerificationOrchestrator,
  StreamingVerificationOrchestrator,
  createOrchestrator,
} from './orchestrator';

export type { VerificationUpdate, UpdateCallback } from './orchestrator';

// Types - re-export with 'export type' for type-only exports
export type {
  ParadigmType,
  Verdict,
  Decision,
  MethodsConfig,
  ParadigmResult,
  VerificationResult,
  ParadigmExecutor,
  ParadigmOptions,
  VerifyOptions,
} from './types';

// Constants, schemas, and functions from types
export {
  FPR_WEIGHTS,
  DECISION_THRESHOLDS,
  methodsConfigSchema,
  calculateConsensus,
  determineDecision,
  createErrorParadigmResult,
  formatParadigmName,
} from './types';

// Service layer
export { verify } from './service';
export type {
  OrganizationContext,
  VerifyServiceRequest,
  VerifyServiceResponse,
  VerifyServiceError,
  VerifyServiceResult,
} from './service';

// Validation
export { validateVerifyRequest, getRequestedMethods, getMethodsCount, VerifyOptionsSchema, MethodsConfigSchema } from './validator';
export type { ValidatedVerifyRequest, ValidationResult } from './validator';

// Quota
export { checkMethodsAllowed, checkMonthlyQuota } from './quota';
export type { QuotaCheckResult, MethodsCheckResult, PlanType } from './quota';

// Repository
export {
  createVerification,
  findByIdempotencyKey,
  markVerificationFailed,
  saveVerificationResult,
} from './repository';
export type { CreateVerificationInput, VerificationRecord, CachedVerificationResult } from './repository';

// Individual paradigms (for advanced usage)
export {
  createSemanticParadigm,
  createReasoningParadigm,
  createToolParadigm,
  createBiPRMParadigm,
  createEnsembleParadigm,
  createEntropyParadigm,
  createFormalParadigm,
} from './methods';
