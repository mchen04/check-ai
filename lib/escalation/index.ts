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
export { getEscalationStatus } from './repository';
