/**
 * Logger Types
 * Type definitions for the structured logging system
 */

import type { Logger as PinoLogger } from 'pino';

/**
 * Context prefixes matching existing patterns in the codebase
 */
export type LogContext =
  | 'AcceptInvite'
  | 'Analytics'
  | 'API'
  | 'ApiKeys'
  | 'ApiKeyService'
  | 'APM'
  | 'Audit'
  | 'Auth'
  | 'Batch'
  | 'Batch Process'
  | 'Batch Trigger'
  | 'BatchStorage'
  | 'Cache'
  | 'Cleanup'
  | 'Cron'
  | 'Email'
  | 'Escalation'
  | 'KeyManager'
  | 'Profile'
  | 'ProviderCredentials'
  | 'RateLimit'
  | 'Realtime'
  | 'Stripe'
  | 'StripeWebhook'
  | 'ToolVerification'
  | 'Verification'
  | 'Waitlist'
  | 'Webhook'
  | 'Webhook Trigger';

/**
 * Metadata that can be attached to log entries
 */
export interface LoggerMeta {
  requestId?: string;
  orgId?: string;
  userId?: string;
  batchId?: string;
  itemId?: string;
  webhookId?: string;
  verificationId?: string;
  deliveryId?: string;
  [key: string]: unknown;
}

/**
 * Application logger type - standard Pino logger
 */
export type AppLogger = PinoLogger;

/**
 * Valid log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Valid log levels array for validation
 */
export const VALID_LOG_LEVELS: readonly LogLevel[] = [
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
] as const;
