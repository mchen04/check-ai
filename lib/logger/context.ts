/**
 * Logger Context Utilities
 * Factory functions for creating context-aware loggers
 */

import crypto from 'crypto';
import { logger } from './logger';
import type { AppLogger, LogContext, LoggerMeta } from './types';

/**
 * Create a module-level logger with a context prefix
 * Use this for service/module-level logging
 *
 * @example
 * const log = createLogger('Webhook');
 * log.info('Processing webhook');
 * log.error({ err: error, webhookId }, 'Failed to deliver');
 */
export function createLogger(context: LogContext, meta?: LoggerMeta): AppLogger {
  return logger.child({
    context,
    ...meta,
  });
}

/**
 * Create a request-scoped logger with correlation ID
 * Use this in API routes and middleware for request tracing
 *
 * @example
 * const log = createRequestLogger(requestId, 'API', { orgId: org.id });
 * log.info({ type: 'api_request', method: 'POST', path: '/api/verify' });
 */
export function createRequestLogger(
  requestId: string,
  context: LogContext,
  additionalMeta?: LoggerMeta
): AppLogger {
  return logger.child({
    requestId,
    context,
    ...additionalMeta,
  });
}

/**
 * Generate a unique request ID
 * Format: req_<base64url encoded 12 random bytes>
 *
 * @example
 * const requestId = generateRequestId();
 * // => "req_abc123xyz789..."
 */
export function generateRequestId(): string {
  return `req_${crypto.randomBytes(12).toString('base64url')}`;
}
