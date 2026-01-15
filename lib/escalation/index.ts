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
} from './service';
export { getEscalationStatus } from './repository';
