/**
 * Logger Configuration
 * Pino-based structured logging with environment-aware configuration
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
const isProduction = process.env.NODE_ENV === 'production';

// Configure transport based on environment
const transport = isProduction
  ? undefined // Default JSON output in production
  : {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    };

/**
 * Base Pino logger configuration
 */
const baseLogger = pino({
  level: LOG_LEVEL,

  // Use transport in development for pretty printing
  transport,

  // Base bindings included in all log entries
  base: {
    env: process.env.NODE_ENV || 'development',
    service: 'verifyai',
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
