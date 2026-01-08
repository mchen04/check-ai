/**
 * Webhook Constants
 * Centralized webhook event types and validation schemas
 */

import { z } from 'zod';

// =============================================================================
// WEBHOOK EVENTS
// =============================================================================

/**
 * Supported webhook event types
 */
export const WEBHOOK_EVENTS = [
  'verification.completed',
  'verification.escalated',
  'escalation.resolved',
  'usage.limit.warning',
  'usage.limit.reached',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/**
 * Display names for webhook events (for UI)
 */
export const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, string> = {
  'verification.completed': 'Verification Completed',
  'verification.escalated': 'Verification Escalated',
  'escalation.resolved': 'Escalation Resolved',
  'usage.limit.warning': 'Usage Limit Warning',
  'usage.limit.reached': 'Usage Limit Reached',
};

/**
 * Descriptions for webhook events (for UI tooltips)
 */
export const WEBHOOK_EVENT_DESCRIPTIONS: Record<WebhookEvent, string> = {
  'verification.completed': 'Triggered when a verification finishes processing',
  'verification.escalated': 'Triggered when a verification requires human review',
  'escalation.resolved': 'Triggered when an escalation is resolved',
  'usage.limit.warning': 'Triggered when usage reaches 80% of limit',
  'usage.limit.reached': 'Triggered when usage limit is reached',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Zod schema for a single webhook event
 */
export const WebhookEventSchema = z.enum(WEBHOOK_EVENTS);

/**
 * Schema for creating a new webhook
 */
export const CreateWebhookSchema = z.object({
  url: z.string().url('Invalid URL'),
  events: z.array(WebhookEventSchema).min(1, 'At least one event is required'),
  description: z.string().max(500).optional(),
});

/**
 * Schema for updating an existing webhook
 */
export const UpdateWebhookSchema = z.object({
  url: z.string().url('Invalid URL').optional(),
  events: z.array(WebhookEventSchema).min(1).optional(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof UpdateWebhookSchema>;
