/**
 * Logger Configuration
 * Pino-based structured logging with environment-aware configuration
 *
 * Note: We avoid pino transports entirely because they use worker threads
 * via thread-stream, which causes "Cannot find module" errors during
 * Next.js hot module reloading. JSON output is used in all environments.
 */

import pino from 'pino';
import type { AppLogger, LogLevel } from './types';
import { VALID_LOG_LEVELS } from './types';

// Validate and get log level from environment
function getLogLevel(): LogLevel {
  const configuredLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;

  if (configuredLevel && !VALID_LOG_LEVELS.includes(configuredLevel)) {
    // Can't use the logger here, so use console.warn
    console.warn(`Invalid LOG_LEVEL "${configuredLevel}", defaulting to "info"`);
    return 'info';
  }

  if (configuredLevel) {
    return configuredLevel;
  }

  // Default: debug in development, info in production
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const LOG_LEVEL = getLogLevel();

/**
 * Base Pino logger configuration
 *
 * Note: We intentionally avoid using pino transports (like pino-pretty)
 * because they spawn worker threads via thread-stream. In Next.js dev mode,
 * hot reloading can cause these worker threads to lose their module context,
 * resulting in "Cannot find module '.next/server/vendor-chunks/lib/worker.js'"
 * errors. JSON output works reliably in all environments.
 *
 * For pretty logs during development, pipe output through pino-pretty:
 *   npm run dev | npx pino-pretty
 */
const baseLogger = pino({
  level: LOG_LEVEL,

  // Base bindings included in all log entries
  base: {
    env: process.env.NODE_ENV || 'development',
    service: 'check',
  },

  // ISO timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,

  // Redact sensitive fields from logs
  redact: {
    paths: [
      'apiKey',
      'password',
      'token',
      'secret',
      'signingSecret',
      'keyHash',
      'authorization',
      '*.apiKey',
      '*.password',
      '*.token',
      '*.secret',
      '*.signingSecret',
      '*.keyHash',
      '*.authorization',
      'headers.authorization',
    ],
    censor: '[REDACTED]',
  },

  // Custom serializers
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: (req) => ({
      method: req?.method,
      url: req?.url,
      path: req?.path,
    }),
  },
});

/**
 * The main logger instance
 * Use createLogger() or createRequestLogger() for context-aware logging
 */
export const logger: AppLogger = baseLogger;
