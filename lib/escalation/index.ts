/**
 * Escalation Module
 *
 * Exports for the escalation system.
 */

// Types - Named exports for tree-shaking
export type {
  EscalationReason,
  EscalationStatus,
  HumanVerdict,
  EscalationDetails,
  EscalationContext,
  EscalationWithVerification,
  ListEscalationsResponse,
  ResolveEscalationRequest,
  ResolveEscalationResponse,
} from './types';
export { REASON_DISPLAY_MAP } from './types';
export {
  createEscalation,
  resolveEscalation,
  dismissEscalation,
} from './service';

export {
  getEscalationStatus,
  listEscalations,
  getEscalationStats,
  getEscalation,
  getEscalationByIdAndOrg,
  findByVerificationId,
  type EscalationRecord,
  type EscalationQueryResult,
} from './repository';
