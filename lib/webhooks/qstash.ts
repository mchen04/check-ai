import { Client, Receiver } from '@upstash/qstash';
import { createLogger } from '@/lib/logger';

const log = createLogger('QStash');

// =============================================================================
// QStash Client Singleton
// =============================================================================

let qstashClient: Client | null = null;

/**
 * Get QStash client instance (singleton)
 * Returns null if QStash is not configured
 */
export function getQStashClient(): Client | null {
  if (qstashClient) return qstashClient;

  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    log.warn('Not configured - webhook retries disabled');
    return null;
  }

  qstashClient = new Client({ token });
  return qstashClient;
}

// =============================================================================
// QStash Receiver for Signature Verification
// =============================================================================

let qstashReceiver: Receiver | null = null;

/**
 * Get QStash receiver for verifying incoming webhook signatures
 * Returns null if QStash signing keys are not configured
 */
export function getQStashReceiver(): Receiver | null {
  if (qstashReceiver) return qstashReceiver;

  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentSigningKey || !nextSigningKey) {
    log.warn('Signing keys not configured - signature verification disabled');
    return null;
  }

  qstashReceiver = new Receiver({
    currentSigningKey,
    nextSigningKey,
  });

  return qstashReceiver;
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Maximum number of retry attempts (excluding initial attempt)
 * Total attempts = MAX_RETRIES + 1 = 6
 */
export const MAX_RETRIES = 5;

/**
 * Retry delay formula for exponential backoff
 * pow(2, retried) * 60000 gives: 1m, 2m, 4m, 8m, 16m
 */
export const RETRY_DELAY_FORMULA = 'pow(2, retried) * 60000';

/**
 * Timeout for webhook delivery in seconds
 */
export const WEBHOOK_TIMEOUT_SECONDS = 30;

/**
 * Get the base URL for webhook handler endpoints
 * Uses NEXT_PUBLIC_WEBSITE_URL or falls back to localhost
 */
export function getWebhookHandlerBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3000';
  return `${baseUrl}/api/webhooks/deliver`;
}

// =============================================================================
// Types
// =============================================================================

export interface QueuedWebhookPayload {
  deliveryId: string;
  webhookId: string;
  orgId: string;
  event: string;
  data: Record<string, unknown>;
  attempt: number;
}

export interface QStashPublishOptions {
  url: string;
  body: QueuedWebhookPayload;
  retries?: number;
  callback?: string;
  failureCallback?: string;
  timeout?: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if QStash is properly configured
 */
export function isQStashConfigured(): boolean {
  return !!(
    process.env.QSTASH_TOKEN &&
    process.env.QSTASH_CURRENT_SIGNING_KEY &&
    process.env.QSTASH_NEXT_SIGNING_KEY
  );
}
