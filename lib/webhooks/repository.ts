/**
 * Webhooks Repository
 * Database operations for webhook management
 */

import { db } from '@/utils/db/db';
import { webhooksTable, webhookDeliveriesTable } from '@/utils/db/schema';
import { eq, desc, and } from 'drizzle-orm';

// =============================================================================
// TYPES
// =============================================================================

export interface WebhookRecord {
  id: string;
  orgId: string;
  url: string;
  events: string[];
  description: string | null;
  signingSecret: string;
  isActive: boolean;
  lastTriggeredAt: Date | null;
  lastStatus: number | null;
  failureCount: number;
  createdAt: Date;
}

export interface WebhookListItem {
  id: string;
  url: string;
  events: string[];
  description: string | null;
  isActive: boolean;
  lastTriggeredAt: Date | null;
  lastStatus: number | null;
  failureCount: number;
  createdAt: Date;
}

export interface CreateWebhookInput {
  orgId: string;
  url: string;
  events: string[];
  description?: string | null;
  signingSecret: string;
}

export interface UpdateWebhookInput {
  url?: string;
  events?: string[];
  description?: string | null;
  isActive?: boolean;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: unknown;
  status: 'pending' | 'processing' | 'delivered' | 'failed' | 'retrying';
  qstashMessageId: string | null;
  attemptNumber: number;
  maxAttempts: number;
  nextRetryAt: Date | null;
  responseStatus: number | null;
  responseBody: string | null;
  durationMs: number | null;
  lastError: string | null;
  dlqId: string | null;
  createdAt: Date;
  deliveredAt: Date | null;
  failedAt: Date | null;
}

// =============================================================================
// REPOSITORY FUNCTIONS
// =============================================================================

/**
 * List webhooks for an organization
 */
export async function listWebhooks(orgId: string): Promise<WebhookListItem[]> {
  const webhooks = await db
    .select({
      id: webhooksTable.id,
      url: webhooksTable.url,
      events: webhooksTable.events,
      description: webhooksTable.description,
      isActive: webhooksTable.isActive,
      lastTriggeredAt: webhooksTable.lastTriggeredAt,
      lastStatus: webhooksTable.lastStatus,
      failureCount: webhooksTable.failureCount,
      createdAt: webhooksTable.createdAt,
    })
    .from(webhooksTable)
    .where(eq(webhooksTable.orgId, orgId))
    .orderBy(desc(webhooksTable.createdAt));

  return webhooks;
}

/**
 * Get webhook by ID
 */
export async function getWebhook(
  id: string,
  orgId: string
): Promise<WebhookRecord | null> {
  const [webhook] = await db
    .select()
    .from(webhooksTable)
    .where(and(eq(webhooksTable.id, id), eq(webhooksTable.orgId, orgId)))
    .limit(1);

  return webhook || null;
}

/**
 * Get webhook by ID (without org check - for internal use)
 */
export async function getWebhookById(id: string): Promise<WebhookRecord | null> {
  const [webhook] = await db
    .select()
    .from(webhooksTable)
    .where(eq(webhooksTable.id, id))
    .limit(1);

  return webhook || null;
}

/**
 * Create a new webhook
 */
export async function createWebhook(
  input: CreateWebhookInput
): Promise<WebhookRecord> {
  const [webhook] = await db
    .insert(webhooksTable)
    .values({
      orgId: input.orgId,
      url: input.url,
      events: input.events,
      description: input.description || null,
      signingSecret: input.signingSecret,
    })
    .returning();

  return webhook;
}

/**
 * Update a webhook
 */
export async function updateWebhook(
  id: string,
  orgId: string,
  updates: UpdateWebhookInput
): Promise<WebhookRecord | null> {
  const [webhook] = await db
    .update(webhooksTable)
    .set(updates)
    .where(and(eq(webhooksTable.id, id), eq(webhooksTable.orgId, orgId)))
    .returning();

  return webhook || null;
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(id: string, orgId: string): Promise<boolean> {
  const result = await db
    .delete(webhooksTable)
    .where(and(eq(webhooksTable.id, id), eq(webhooksTable.orgId, orgId)))
    .returning({ id: webhooksTable.id });

  return result.length > 0;
}

/**
 * Update webhook delivery status
 */
export async function updateWebhookDeliveryStatus(
  id: string,
  status: number,
  failureCount: number
): Promise<void> {
  await db
    .update(webhooksTable)
    .set({
      lastTriggeredAt: new Date(),
      lastStatus: status,
      failureCount,
    })
    .where(eq(webhooksTable.id, id));
}

/**
 * Get webhook deliveries
 */
export async function getWebhookDeliveries(
  webhookId: string,
  limit: number = 20
): Promise<WebhookDelivery[]> {
  const deliveries = await db
    .select()
    .from(webhookDeliveriesTable)
    .where(eq(webhookDeliveriesTable.webhookId, webhookId))
    .orderBy(desc(webhookDeliveriesTable.createdAt))
    .limit(limit);

  return deliveries as WebhookDelivery[];
}

/**
 * Get active webhooks for events in organization
 */
export async function getActiveWebhooksForOrg(orgId: string): Promise<WebhookRecord[]> {
  const webhooks = await db
    .select()
    .from(webhooksTable)
    .where(and(eq(webhooksTable.orgId, orgId), eq(webhooksTable.isActive, true)));

  return webhooks;
}
