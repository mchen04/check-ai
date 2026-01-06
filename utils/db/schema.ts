import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  decimal,
  jsonb,
  pgEnum,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// =============================================================================
// ENUMS
// =============================================================================

export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'escalated',
]);

export const paradigmTypeEnum = pgEnum('paradigm_type', [
  'semantic',
  'reasoning',
  'tool',
  'biprm',
  'ensemble',
  'entropy',
  'formal',
]);

export const escalationReasonEnum = pgEnum('escalation_reason', [
  'low_confidence',
  'conflicting_results',
  'model_failure',
  'timeout',
  'manual_review_requested',
]);

export const orgRoleEnum = pgEnum('org_role', ['owner', 'admin', 'member', 'viewer']);

export const planTypeEnum = pgEnum('plan_type', ['free', 'pro', 'enterprise']);

export const inviteStatusEnum = pgEnum('invite_status', [
  'pending',
  'accepted',
  'expired',
  'revoked',
]);

export const webhookDeliveryStatusEnum = pgEnum('webhook_delivery_status', [
  'pending', // Queued, not yet attempted
  'processing', // Currently being delivered
  'delivered', // Successfully delivered (2xx)
  'retrying', // Failed, scheduled for retry
  'failed', // All retries exhausted (in DLQ)
]);

export const auditEventTypeEnum = pgEnum('audit_event_type', [
  // API Key events
  'api_key.created',
  'api_key.deleted',
  // Team member events
  'team_member.invited',
  'team_member.invite_revoked',
  'team_member.joined',
  'team_member.removed',
  'team_member.role_changed',
  // Webhook events
  'webhook.created',
  'webhook.updated',
  'webhook.deleted',
  // Organization settings events
  'org.settings_updated',
  // Escalation events
  'escalation.resolved',
  'escalation.dismissed',
  // Batch events
  'batch.created',
  'batch.completed',
  'batch.failed',
  'batch.cancelled',
]);

// =============================================================================
// BATCH PROCESSING ENUMS
// =============================================================================

export const batchStatusEnum = pgEnum('batch_status', [
  'pending',     // Created, not yet started
  'validating',  // Parsing/validating input
  'processing',  // Items being processed
  'completed',   // All items finished
  'failed',      // Batch-level failure
  'cancelled',   // User cancelled
]);

export const batchItemStatusEnum = pgEnum('batch_item_status', [
  'pending',     // Awaiting processing
  'queued',      // Sent to QStash
  'processing',  // Currently verifying
  'completed',   // Verification done
  'failed',      // Item-level failure
  'skipped',     // Skipped (e.g., duplicate)
]);

export type AuditEventType = (typeof auditEventTypeEnum.enumValues)[number];

// =============================================================================
// EXISTING TABLES (kept for backward compatibility)
// =============================================================================

export const usersTable = pgTable('users_table', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  plan: text('plan').notNull(),
  stripe_id: text('stripe_id').notNull(),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

// =============================================================================
// ORGANIZATIONS (Multi-tenant support)
// =============================================================================

export const organizationsTable = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  planType: planTypeEnum('plan_type').default('free').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  verificationsUsed: integer('verifications_used').default(0).notNull(),
  verificationsLimit: integer('verifications_limit').default(100).notNull(), // Free tier default
  billingCycleStart: timestamp('billing_cycle_start'),
  billingCycleEnd: timestamp('billing_cycle_end'),
  // Settings columns
  defaultVerificationMethod: text('default_verification_method').default('ensemble').notNull(),
  autoEscalateThreshold: decimal('auto_escalate_threshold', { precision: 3, scale: 2 }).default('0.50').notNull(),
  cacheEnabled: boolean('cache_enabled').default(true).notNull(),
  storeVerificationContent: boolean('store_verification_content').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type InsertOrganization = typeof organizationsTable.$inferInsert;
export type SelectOrganization = typeof organizationsTable.$inferSelect;

// =============================================================================
// ORGANIZATION MEMBERS (RLS support)
// =============================================================================

export const orgMembersTable = pgTable(
  'org_members',
  {
    orgId: uuid('org_id')
      .references(() => organizationsTable.id, { onDelete: 'cascade' })
      .notNull(),
    userId: text('user_id')
      .references(() => usersTable.id, { onDelete: 'cascade' })
      .notNull(),
    role: orgRoleEnum('role').default('member').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.userId] }),
  })
);

export type InsertOrgMember = typeof orgMembersTable.$inferInsert;
export type SelectOrgMember = typeof orgMembersTable.$inferSelect;

// =============================================================================
// ORGANIZATION INVITES (Email-based team invitations)
// =============================================================================

export const orgInvitesTable = pgTable('org_invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .references(() => organizationsTable.id, { onDelete: 'cascade' })
    .notNull(),
  email: text('email').notNull(),
  role: orgRoleEnum('role').default('member').notNull(),
  token: text('token').notNull().unique(),
  invitedBy: text('invited_by').references(() => usersTable.id, { onDelete: 'set null' }),
  status: inviteStatusEnum('status').default('pending').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at'),
});

export type InsertOrgInvite = typeof orgInvitesTable.$inferInsert;
export type SelectOrgInvite = typeof orgInvitesTable.$inferSelect;

// =============================================================================
// API KEYS (BYOK + Platform keys)
// =============================================================================

export const apiKeysTable = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .references(() => organizationsTable.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(), // User-friendly name for the key
  keyHash: text('key_hash').notNull(), // SHA-256 hash of the API key
  keyPrefix: text('key_prefix').notNull(), // First 8 chars for identification (e.g., "vfy_abc1")
  provider: text('provider').notNull(), // 'platform', 'openai', 'anthropic', 'google', 'deepseek', etc.
  encryptedKey: text('encrypted_key'), // For BYOK: AES-256 encrypted provider API key
  isActive: boolean('is_active').default(true).notNull(),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type InsertApiKey = typeof apiKeysTable.$inferInsert;
export type SelectApiKey = typeof apiKeysTable.$inferSelect;

// =============================================================================
// VERIFICATIONS (Core verification requests)
// =============================================================================

export const verificationsTable = pgTable('verifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .references(() => organizationsTable.id, { onDelete: 'cascade' })
    .notNull(),
  idempotencyKey: text('idempotency_key').unique(), // For idempotent requests
  content: text('content').notNull(), // The content to verify
  context: jsonb('context'), // Additional context for verification
  methodsConfig: jsonb('methods_config').notNull(), // { semantic: 0.3, reasoning: 0.5, ... }
  status: verificationStatusEnum('status').default('pending').notNull(),
  finalVerdict: text('final_verdict'), // 'true', 'false', 'uncertain'
  confidenceScore: decimal('confidence_score', { precision: 5, scale: 4 }), // 0.0000 - 1.0000
  decision: text('decision'), // 'accept', 'refine', 'escalate', 'reject'
  reasoning: text('reasoning'), // Aggregated reasoning explanation
  processingTimeMs: integer('processing_time_ms'),
  costCents: integer('cost_cents'), // Total cost in cents
  cachedResult: boolean('cached_result').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export type InsertVerification = typeof verificationsTable.$inferInsert;
export type SelectVerification = typeof verificationsTable.$inferSelect;

// =============================================================================
// PARADIGM RESULTS (Individual method results)
// =============================================================================

export const paradigmResultsTable = pgTable('paradigm_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  verificationId: uuid('verification_id')
    .references(() => verificationsTable.id, { onDelete: 'cascade' })
    .notNull(),
  paradigmType: paradigmTypeEnum('paradigm_type').notNull(),
  weight: decimal('weight', { precision: 3, scale: 2 }).notNull(), // User-specified weight 0.00-1.00
  provider: text('provider').notNull(), // 'openai', 'anthropic', 'google', etc.
  model: text('model').notNull(), // 'gpt-4o', 'claude-3-sonnet', etc.
  verdict: text('verdict'), // 'true', 'false', 'uncertain'
  confidence: decimal('confidence', { precision: 5, scale: 4 }), // 0.0000 - 1.0000
  reasoning: text('reasoning'), // Explanation from the model
  rawResponse: jsonb('raw_response'), // Full API response for debugging
  tokenUsage: jsonb('token_usage'), // { inputTokens: number, outputTokens: number }
  processingTimeMs: integer('processing_time_ms'),
  costCents: integer('cost_cents'),
  errorMessage: text('error_message'), // If paradigm failed
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type InsertParadigmResult = typeof paradigmResultsTable.$inferInsert;
export type SelectParadigmResult = typeof paradigmResultsTable.$inferSelect;

// =============================================================================
// ESCALATIONS (Human review queue)
// =============================================================================

export const escalationsTable = pgTable('escalations', {
  id: uuid('id').defaultRandom().primaryKey(),
  verificationId: uuid('verification_id')
    .references(() => verificationsTable.id, { onDelete: 'cascade' })
    .notNull(),
  reason: escalationReasonEnum('reason').notNull(),
  details: jsonb('details'), // Additional context for escalation
  priority: integer('priority').default(1).notNull(), // 1 = low, 2 = medium, 3 = high
  deadline: timestamp('deadline'), // Optional deadline for resolution
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: text('resolved_by').references(() => usersTable.id),
  resolution: text('resolution'), // Human decision/notes
  humanVerdict: text('human_verdict'), // 'true', 'false', 'uncertain'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type InsertEscalation = typeof escalationsTable.$inferInsert;
export type SelectEscalation = typeof escalationsTable.$inferSelect;

// =============================================================================
// USAGE TRACKING (Billing)
// =============================================================================

export const usageTable = pgTable('usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .references(() => organizationsTable.id, { onDelete: 'cascade' })
    .notNull(),
  verificationId: uuid('verification_id').references(() => verificationsTable.id, {
    onDelete: 'set null',
  }),
  provider: text('provider').notNull(), // 'openai', 'anthropic', etc.
  model: text('model').notNull(), // 'gpt-4o', 'claude-3-sonnet', etc.
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  costCents: integer('cost_cents').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type InsertUsage = typeof usageTable.$inferInsert;
export type SelectUsage = typeof usageTable.$inferSelect;

// =============================================================================
// WEBHOOKS (Organization webhook configurations)
// =============================================================================

export const webhooksTable = pgTable('webhooks', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .references(() => organizationsTable.id, { onDelete: 'cascade' })
    .notNull(),
  url: text('url').notNull(),
  signingSecret: text('signing_secret').notNull(), // For HMAC-SHA256 signature
  events: text('events').array().notNull(), // Array of event types
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  lastTriggeredAt: timestamp('last_triggered_at'),
  lastStatus: integer('last_status'), // HTTP status from last delivery
  failureCount: integer('failure_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type InsertWebhook = typeof webhooksTable.$inferInsert;
export type SelectWebhook = typeof webhooksTable.$inferSelect;

// =============================================================================
// WEBHOOK DELIVERIES (Delivery logs with retry tracking)
// =============================================================================

// Type for attempt history records
export interface WebhookAttemptRecord {
  attemptNumber: number;
  timestamp: string;
  responseStatus?: number;
  responseBody?: string;
  durationMs: number;
  error?: string;
}

export const webhookDeliveriesTable = pgTable('webhook_deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  webhookId: uuid('webhook_id')
    .references(() => webhooksTable.id, { onDelete: 'cascade' })
    .notNull(),
  event: text('event').notNull(),
  payload: jsonb('payload').notNull(),

  // Delivery status tracking
  status: webhookDeliveryStatusEnum('status').default('pending').notNull(),
  qstashMessageId: text('qstash_message_id'), // QStash tracking ID

  // Retry tracking
  attemptNumber: integer('attempt_number').default(1).notNull(),
  maxAttempts: integer('max_attempts').default(6).notNull(),
  nextRetryAt: timestamp('next_retry_at'),

  // Response data (from latest attempt)
  responseStatus: integer('response_status'),
  responseBody: text('response_body'),
  durationMs: integer('duration_ms'),
  lastError: text('last_error'),

  // DLQ support for manual replay
  dlqId: text('dlq_id'),

  // Attempt history (array of WebhookAttemptRecord)
  attemptHistory: jsonb('attempt_history').$type<WebhookAttemptRecord[]>(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deliveredAt: timestamp('delivered_at'),
  failedAt: timestamp('failed_at'), // When moved to DLQ

  // Legacy field for backward compatibility
  success: boolean('success').default(false).notNull(),
});

export type InsertWebhookDelivery = typeof webhookDeliveriesTable.$inferInsert;
export type SelectWebhookDelivery = typeof webhookDeliveriesTable.$inferSelect;

// =============================================================================
// USER PREFERENCES (Notification settings per user)
// =============================================================================

export const userPreferencesTable = pgTable('user_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .references(() => usersTable.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  orgId: uuid('org_id')
    .references(() => organizationsTable.id, { onDelete: 'cascade' })
    .notNull(),
  emailNotifications: boolean('email_notifications').default(true).notNull(),
  weeklyReport: boolean('weekly_report').default(false).notNull(),
  escalationAlerts: boolean('escalation_alerts').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type InsertUserPreferences = typeof userPreferencesTable.$inferInsert;
export type SelectUserPreferences = typeof userPreferencesTable.$inferSelect;

// =============================================================================
// AUDIT LOGS (Immutable activity trail)
// =============================================================================

// Type for audit log changes (before/after)
export interface AuditChanges {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

// Type for audit log metadata
export interface AuditMetadata {
  ipAddress?: string;
  userAgent?: string;
  [key: string]: unknown;
}

export const auditLogsTable = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .references(() => organizationsTable.id, { onDelete: 'cascade' })
    .notNull(),
  userId: text('user_id').references(() => usersTable.id, { onDelete: 'set null' }),
  eventType: auditEventTypeEnum('event_type').notNull(),
  description: text('description').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  changes: jsonb('changes').$type<AuditChanges>(),
  metadata: jsonb('metadata').$type<AuditMetadata>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type InsertAuditLog = typeof auditLogsTable.$inferInsert;
export type SelectAuditLog = typeof auditLogsTable.$inferSelect;

// =============================================================================
// BATCH JOBS (Bulk verification jobs)
// =============================================================================

// Type for validation errors in batch processing
export interface BatchValidationError {
  row: number;
  error: string;
}

export const batchJobsTable = pgTable('batch_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .references(() => organizationsTable.id, { onDelete: 'cascade' })
    .notNull(),

  // Job metadata
  name: text('name'), // User-friendly name
  inputFormat: text('input_format').notNull(), // 'json' | 'csv'
  originalFileName: text('original_file_name'),

  // Configuration
  methodsConfig: jsonb('methods_config').notNull(), // Same as verification
  context: jsonb('context'), // Shared context for all items

  // Processing state
  status: batchStatusEnum('status').default('pending').notNull(),
  totalItems: integer('total_items').default(0).notNull(),
  processedItems: integer('processed_items').default(0).notNull(),
  successCount: integer('success_count').default(0).notNull(),
  failureCount: integer('failure_count').default(0).notNull(),

  // QStash tracking
  qstashMessageIds: text('qstash_message_ids').array(),

  // Error handling
  errorMessage: text('error_message'),
  validationErrors: jsonb('validation_errors').$type<BatchValidationError[]>(),

  // Cost/usage tracking
  totalCostCents: integer('total_cost_cents').default(0).notNull(),
  totalInputTokens: integer('total_input_tokens').default(0).notNull(),
  totalOutputTokens: integer('total_output_tokens').default(0).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  expiresAt: timestamp('expires_at'), // Auto-cleanup
});

export type InsertBatchJob = typeof batchJobsTable.$inferInsert;
export type SelectBatchJob = typeof batchJobsTable.$inferSelect;

// =============================================================================
// BATCH ITEMS (Individual items within a batch)
// =============================================================================

export const batchItemsTable = pgTable('batch_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  batchId: uuid('batch_id')
    .references(() => batchJobsTable.id, { onDelete: 'cascade' })
    .notNull(),

  // Item position and identification
  itemIndex: integer('item_index').notNull(), // 0-based index in batch
  idempotencyKey: text('idempotency_key'), // Optional per-item key

  // Input data
  content: text('content').notNull(),
  itemContext: jsonb('item_context'), // Per-item context overrides

  // Processing state
  status: batchItemStatusEnum('status').default('pending').notNull(),
  verificationId: uuid('verification_id') // Link to verification record
    .references(() => verificationsTable.id, { onDelete: 'set null' }),

  // Results (denormalized for quick access)
  verdict: text('verdict'),
  confidence: decimal('confidence', { precision: 5, scale: 4 }),
  decision: text('decision'),

  // Error handling
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0).notNull(),

  // Cost tracking
  costCents: integer('cost_cents'),
  processingTimeMs: integer('processing_time_ms'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
});

export type InsertBatchItem = typeof batchItemsTable.$inferInsert;
export type SelectBatchItem = typeof batchItemsTable.$inferSelect;

// =============================================================================
// ANALYTICS DAILY SNAPSHOTS (Pre-aggregated metrics)
// =============================================================================

// Type for confidence calibration buckets
export interface ConfidenceCalibrationBucket {
  count: number;
  correct: number;
  incorrect: number;
  avgConfidence: number;
}

export interface ConfidenceCalibrationBuckets {
  '0.0-0.1': ConfidenceCalibrationBucket;
  '0.1-0.2': ConfidenceCalibrationBucket;
  '0.2-0.3': ConfidenceCalibrationBucket;
  '0.3-0.4': ConfidenceCalibrationBucket;
  '0.4-0.5': ConfidenceCalibrationBucket;
  '0.5-0.6': ConfidenceCalibrationBucket;
  '0.6-0.7': ConfidenceCalibrationBucket;
  '0.7-0.8': ConfidenceCalibrationBucket;
  '0.8-0.9': ConfidenceCalibrationBucket;
  '0.9-1.0': ConfidenceCalibrationBucket;
}

export const analyticsDailySnapshotsTable = pgTable('analytics_daily_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .references(() => organizationsTable.id, { onDelete: 'cascade' })
    .notNull(),
  date: timestamp('date').notNull(), // Date of the snapshot (midnight UTC)

  // Per-paradigm metrics
  paradigmType: paradigmTypeEnum('paradigm_type').notNull(),

  // Counts for FPR calculation
  totalVerifications: integer('total_verifications').default(0).notNull(),
  escalatedCount: integer('escalated_count').default(0).notNull(),
  resolvedCount: integer('resolved_count').default(0).notNull(),
  falsePositives: integer('false_positives').default(0).notNull(), // Human corrected AI verdict
  truePositives: integer('true_positives').default(0).notNull(), // Human agreed with AI

  // Confidence calibration buckets
  confidenceBuckets: jsonb('confidence_buckets').$type<ConfidenceCalibrationBuckets>(),

  // Cost metrics
  totalCostCents: integer('total_cost_cents').default(0).notNull(),
  avgCostPerVerification: decimal('avg_cost_per_verification', { precision: 10, scale: 4 }),
  avgCostPerAccurate: decimal('avg_cost_per_accurate', { precision: 10, scale: 4 }), // Cost efficiency

  // Performance metrics
  avgConfidence: decimal('avg_confidence', { precision: 5, scale: 4 }),
  avgProcessingTimeMs: integer('avg_processing_time_ms'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type InsertAnalyticsDailySnapshot = typeof analyticsDailySnapshotsTable.$inferInsert;
export type SelectAnalyticsDailySnapshot = typeof analyticsDailySnapshotsTable.$inferSelect;

// =============================================================================
// RELATIONS
// =============================================================================

export const organizationsRelations = relations(organizationsTable, ({ many }) => ({
  members: many(orgMembersTable),
  invites: many(orgInvitesTable),
  apiKeys: many(apiKeysTable),
  verifications: many(verificationsTable),
  usage: many(usageTable),
  webhooks: many(webhooksTable),
  userPreferences: many(userPreferencesTable),
  auditLogs: many(auditLogsTable),
  batchJobs: many(batchJobsTable),
  analyticsDailySnapshots: many(analyticsDailySnapshotsTable),
}));

export const orgMembersRelations = relations(orgMembersTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [orgMembersTable.orgId],
    references: [organizationsTable.id],
  }),
  user: one(usersTable, {
    fields: [orgMembersTable.userId],
    references: [usersTable.id],
  }),
}));

export const orgInvitesRelations = relations(orgInvitesTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [orgInvitesTable.orgId],
    references: [organizationsTable.id],
  }),
  inviter: one(usersTable, {
    fields: [orgInvitesTable.invitedBy],
    references: [usersTable.id],
  }),
}));

export const apiKeysRelations = relations(apiKeysTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [apiKeysTable.orgId],
    references: [organizationsTable.id],
  }),
}));

export const verificationsRelations = relations(verificationsTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [verificationsTable.orgId],
    references: [organizationsTable.id],
  }),
  paradigmResults: many(paradigmResultsTable),
  escalation: one(escalationsTable),
}));

export const paradigmResultsRelations = relations(paradigmResultsTable, ({ one }) => ({
  verification: one(verificationsTable, {
    fields: [paradigmResultsTable.verificationId],
    references: [verificationsTable.id],
  }),
}));

export const escalationsRelations = relations(escalationsTable, ({ one }) => ({
  verification: one(verificationsTable, {
    fields: [escalationsTable.verificationId],
    references: [verificationsTable.id],
  }),
  resolvedByUser: one(usersTable, {
    fields: [escalationsTable.resolvedBy],
    references: [usersTable.id],
  }),
}));

export const usageRelations = relations(usageTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [usageTable.orgId],
    references: [organizationsTable.id],
  }),
  verification: one(verificationsTable, {
    fields: [usageTable.verificationId],
    references: [verificationsTable.id],
  }),
}));

export const webhooksRelations = relations(webhooksTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [webhooksTable.orgId],
    references: [organizationsTable.id],
  }),
  deliveries: many(webhookDeliveriesTable),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveriesTable, ({ one }) => ({
  webhook: one(webhooksTable, {
    fields: [webhookDeliveriesTable.webhookId],
    references: [webhooksTable.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferencesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userPreferencesTable.userId],
    references: [usersTable.id],
  }),
  organization: one(organizationsTable, {
    fields: [userPreferencesTable.orgId],
    references: [organizationsTable.id],
  }),
}));

export const auditLogsRelations = relations(auditLogsTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [auditLogsTable.orgId],
    references: [organizationsTable.id],
  }),
  user: one(usersTable, {
    fields: [auditLogsTable.userId],
    references: [usersTable.id],
  }),
}));

export const batchJobsRelations = relations(batchJobsTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [batchJobsTable.orgId],
    references: [organizationsTable.id],
  }),
  items: many(batchItemsTable),
}));

export const batchItemsRelations = relations(batchItemsTable, ({ one }) => ({
  batch: one(batchJobsTable, {
    fields: [batchItemsTable.batchId],
    references: [batchJobsTable.id],
  }),
  verification: one(verificationsTable, {
    fields: [batchItemsTable.verificationId],
    references: [verificationsTable.id],
  }),
}));

export const analyticsDailySnapshotsRelations = relations(analyticsDailySnapshotsTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [analyticsDailySnapshotsTable.orgId],
    references: [organizationsTable.id],
  }),
}));

// =============================================================================
// PLAN LIMITS CONFIGURATION
// =============================================================================

export const PLAN_LIMITS = {
  free: {
    verificationsPerMonth: 100,
    allowedMethods: ['semantic'] as const,
    rateLimit: { windowMs: 60000, maxRequests: 10 }, // 10/min
  },
  pro: {
    verificationsPerMonth: 5000,
    allowedMethods: [
      'semantic',
      'reasoning',
      'tool',
      'biprm',
      'ensemble',
      'entropy',
      'formal',
    ] as const,
    rateLimit: { windowMs: 60000, maxRequests: 100 }, // 100/min
  },
  enterprise: {
    verificationsPerMonth: Infinity,
    allowedMethods: [
      'semantic',
      'reasoning',
      'tool',
      'biprm',
      'ensemble',
      'entropy',
      'formal',
    ] as const,
    rateLimit: { windowMs: 60000, maxRequests: 1000 }, // 1000/min
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;
export type ParadigmType = (typeof paradigmTypeEnum.enumValues)[number];
export type BatchStatus = (typeof batchStatusEnum.enumValues)[number];
export type BatchItemStatus = (typeof batchItemStatusEnum.enumValues)[number];
