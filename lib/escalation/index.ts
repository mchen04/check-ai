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
  determineEscalationReason,
  calculatePriority,
  buildEscalationDetails,
  getEscalationStatus,
} from './service';
