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

// =============================================================================
// WEBHOOK DELIVERY STATUSES
// =============================================================================

/**
 * Valid webhook delivery statuses
 */
export const WEBHOOK_DELIVERY_STATUSES = [
  'pending',
  'processing',
  'delivered',
  'retrying',
  'failed',
] as const;

export type WebhookDeliveryStatus = (typeof WEBHOOK_DELIVERY_STATUSES)[number];

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
  url: z.url({ message: 'Invalid URL' }),
  events: z.array(WebhookEventSchema).min(1, 'At least one event is required'),
  description: z.string().max(500).optional(),
});

/**
 * Schema for updating an existing webhook
 */
export const UpdateWebhookSchema = z.object({
  url: z.url({ message: 'Invalid URL' }).optional(),
  events: z.array(WebhookEventSchema).min(1).optional(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof UpdateWebhookSchema>;
