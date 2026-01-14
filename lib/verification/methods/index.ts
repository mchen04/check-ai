/**
 * Verification Methods Index
 * Exports all 7 verification paradigms and shared utilities
 */

export { SemanticParadigm, createSemanticParadigm } from './semantic';
export { ReasoningParadigm, createReasoningParadigm } from './reasoning';
export { ToolParadigm, createToolParadigm } from './tool';
export { BiPRMParadigm, createBiPRMParadigm } from './biprm';
export { EnsembleParadigm, createEnsembleParadigm } from './ensemble';
export { EntropyParadigm, createEntropyParadigm } from './entropy';
export { FormalParadigm, createFormalParadigm } from './formal';

// Export shared utilities for external use
export {
  DEFAULT_PARADIGM_MODELS,
  getDefaultModel,
  selectBestProvider,
  createParadigmErrorResult,
  normalizeVerdict,
  normalizeConfidence,
  extractJsonFromResponse,
  REASONING_PROVIDER_PREFERENCE,
} from './shared';
