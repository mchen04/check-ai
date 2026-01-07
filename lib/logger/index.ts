/**
 * Logger Module
 * Structured logging with Pino
 *
 * @example
 * // Module-level logger
 * import { createLogger } from '@/lib/logger';
 * const log = createLogger('Webhook');
 * log.info('Processing');
 * log.error({ err: error }, 'Failed');
 *
 * @example
 * // Request-scoped logger
 * import { createRequestLogger, generateRequestId } from '@/lib/logger';
 * const requestId = generateRequestId();
 * const log = createRequestLogger(requestId, 'API', { orgId });
 * log.info({ method: 'POST', path: '/api/verify' }, 'Request received');
 */

export { logger } from './logger';
export { createLogger, createRequestLogger, generateRequestId } from './context';
export type { AppLogger, LogContext, LoggerMeta, LogLevel } from './types';
