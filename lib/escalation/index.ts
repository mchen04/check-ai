/**
 * Escalation Module
 *
 * Exports for the escalation system.
 */

export * from './types';
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
