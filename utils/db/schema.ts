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
    primaryKey
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
    'escalated'
]);

export const paradigmTypeEnum = pgEnum('paradigm_type', [
    'semantic',
    'reasoning',
    'tool',
    'biprm',
    'ensemble',
    'entropy',
    'formal'
]);

export const escalationReasonEnum = pgEnum('escalation_reason', [
    'low_confidence',
    'conflicting_results',
    'model_failure',
    'timeout',
    'manual_review_requested'
]);

export const orgRoleEnum = pgEnum('org_role', [
    'owner',
    'admin',
    'member',
    'viewer'
]);

export const planTypeEnum = pgEnum('plan_type', [
    'free',
    'pro',
    'enterprise'
]);

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
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type InsertOrganization = typeof organizationsTable.$inferInsert;
export type SelectOrganization = typeof organizationsTable.$inferSelect;

// =============================================================================
// ORGANIZATION MEMBERS (RLS support)
// =============================================================================

export const orgMembersTable = pgTable('org_members', {
    orgId: uuid('org_id').references(() => organizationsTable.id, { onDelete: 'cascade' }).notNull(),
    userId: text('user_id').references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
    role: orgRoleEnum('role').default('member').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.userId] }),
}));

export type InsertOrgMember = typeof orgMembersTable.$inferInsert;
export type SelectOrgMember = typeof orgMembersTable.$inferSelect;

// =============================================================================
// API KEYS (BYOK + Platform keys)
// =============================================================================

export const apiKeysTable = pgTable('api_keys', {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id').references(() => organizationsTable.id, { onDelete: 'cascade' }).notNull(),
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
    orgId: uuid('org_id').references(() => organizationsTable.id, { onDelete: 'cascade' }).notNull(),
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
    verificationId: uuid('verification_id').references(() => verificationsTable.id, { onDelete: 'cascade' }).notNull(),
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
    verificationId: uuid('verification_id').references(() => verificationsTable.id, { onDelete: 'cascade' }).notNull(),
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
    orgId: uuid('org_id').references(() => organizationsTable.id, { onDelete: 'cascade' }).notNull(),
    verificationId: uuid('verification_id').references(() => verificationsTable.id, { onDelete: 'set null' }),
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
// RELATIONS
// =============================================================================

export const organizationsRelations = relations(organizationsTable, ({ many }) => ({
    members: many(orgMembersTable),
    apiKeys: many(apiKeysTable),
    verifications: many(verificationsTable),
    usage: many(usageTable),
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
        allowedMethods: ['semantic', 'reasoning', 'tool', 'biprm', 'ensemble', 'entropy', 'formal'] as const,
        rateLimit: { windowMs: 60000, maxRequests: 100 }, // 100/min
    },
    enterprise: {
        verificationsPerMonth: Infinity,
        allowedMethods: ['semantic', 'reasoning', 'tool', 'biprm', 'ensemble', 'entropy', 'formal'] as const,
        rateLimit: { windowMs: 60000, maxRequests: 1000 }, // 1000/min
    },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;
export type ParadigmType = typeof paradigmTypeEnum.enumValues[number];
