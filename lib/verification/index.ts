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
} from './types';

// Constants and functions from types
export {
    FPR_WEIGHTS,
    DECISION_THRESHOLDS,
    calculateConsensus,
    determineDecision,
} from './types';

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
