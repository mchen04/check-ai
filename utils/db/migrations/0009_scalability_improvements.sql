-- Migration: Scalability Improvements
-- Adds composite indexes, partial indexes, and optimizations for high-volume SaaS

-- =============================================================================
-- PART 1: Composite indexes for common query patterns
-- =============================================================================

-- Verifications: Most common query is by org + time (dashboard, pagination)
CREATE INDEX IF NOT EXISTS "idx_verifications_org_created"
  ON "verifications" ("org_id", "created_at" DESC);

-- Verifications: Query by org + status (filtering)
CREATE INDEX IF NOT EXISTS "idx_verifications_org_status"
  ON "verifications" ("org_id", "status");

-- Batch jobs: Query by org + time
CREATE INDEX IF NOT EXISTS "idx_batch_jobs_org_created"
  ON "batch_jobs" ("org_id", "created_at" DESC);

-- Batch jobs: Query by org + status
CREATE INDEX IF NOT EXISTS "idx_batch_jobs_org_status"
  ON "batch_jobs" ("org_id", "status");

-- Usage: Query by org + time (billing reports)
CREATE INDEX IF NOT EXISTS "idx_usage_org_created"
  ON "usage" ("org_id", "created_at" DESC);

-- Audit logs: Query by org + time
CREATE INDEX IF NOT EXISTS "idx_audit_logs_org_created"
  ON "audit_logs" ("org_id", "created_at" DESC);

-- Escalations: Query unresolved (NULL resolvedAt)
CREATE INDEX IF NOT EXISTS "idx_escalations_org_unresolved"
  ON "escalations" ("verification_id")
  WHERE "resolved_at" IS NULL;

-- =============================================================================
-- PART 2: Partial indexes for active/hot data
-- =============================================================================

-- Active API keys (most queries only need active keys)
CREATE INDEX IF NOT EXISTS "idx_api_keys_org_active"
  ON "api_keys" ("org_id", "key_hash")
  WHERE "is_active" = true;

-- Pending verifications (for processing queue)
CREATE INDEX IF NOT EXISTS "idx_verifications_pending"
  ON "verifications" ("created_at" ASC)
  WHERE "status" IN ('pending', 'processing');

-- Pending batch items (for processing queue)
CREATE INDEX IF NOT EXISTS "idx_batch_items_pending"
  ON "batch_items" ("batch_id", "item_index")
  WHERE "status" IN ('pending', 'queued', 'processing');

-- Active webhooks only
CREATE INDEX IF NOT EXISTS "idx_webhooks_org_active"
  ON "webhooks" ("org_id")
  WHERE "is_active" = true;

-- Pending webhook deliveries (for retry processing)
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_retry"
  ON "webhook_deliveries" ("next_retry_at")
  WHERE "status" IN ('pending', 'retrying');

-- Pending org invites (for invite lookups)
CREATE INDEX IF NOT EXISTS "idx_org_invites_pending"
  ON "org_invites" ("email", "expires_at")
  WHERE "status" = 'pending';

-- =============================================================================
-- PART 3: Authentication & lookup indexes
-- =============================================================================

-- API key hash lookup (critical for auth performance)
CREATE INDEX IF NOT EXISTS "idx_api_keys_hash"
  ON "api_keys" ("key_hash")
  WHERE "is_active" = true;

-- Idempotency key lookup (for deduplication)
CREATE INDEX IF NOT EXISTS "idx_verifications_idempotency"
  ON "verifications" ("idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

-- Org invite token lookup (for accept flow)
CREATE INDEX IF NOT EXISTS "idx_org_invites_token"
  ON "org_invites" ("token");

-- Stripe customer ID lookup (for webhook processing)
CREATE INDEX IF NOT EXISTS "idx_organizations_stripe_customer"
  ON "organizations" ("stripe_customer_id")
  WHERE "stripe_customer_id" IS NOT NULL;

-- =============================================================================
-- PART 4: Time-series optimizations with BRIN
-- =============================================================================
-- BRIN indexes are much smaller than btree for time-series append-only data
-- Great for audit logs and usage tracking where we mostly query recent data

-- Audit logs BRIN (efficient for time-range queries on append-only table)
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_brin"
  ON "audit_logs" USING BRIN ("created_at");

-- Usage table BRIN (for billing period queries)
CREATE INDEX IF NOT EXISTS "idx_usage_created_brin"
  ON "usage" USING BRIN ("created_at");

-- =============================================================================
-- PART 5: Data retention support
-- =============================================================================

-- Verifications expiry (for cleanup job)
CREATE INDEX IF NOT EXISTS "idx_verifications_expires"
  ON "verifications" ("expires_at")
  WHERE "expires_at" IS NOT NULL;

-- Batch jobs expiry (for cleanup job)
CREATE INDEX IF NOT EXISTS "idx_batch_jobs_expires"
  ON "batch_jobs" ("expires_at")
  WHERE "expires_at" IS NOT NULL;

-- =============================================================================
-- PART 6: Analytics optimization
-- =============================================================================

-- Analytics snapshots: Query by org + date + paradigm
CREATE INDEX IF NOT EXISTS "idx_analytics_org_date_paradigm"
  ON "analytics_daily_snapshots" ("org_id", "date" DESC, "paradigm_type");

-- =============================================================================
-- PART 7: Cursor-based pagination support
-- =============================================================================
-- These compound indexes support efficient keyset/cursor pagination
-- Pattern: WHERE (created_at, id) < ($cursor_time, $cursor_id) ORDER BY created_at DESC, id DESC

-- Verifications cursor pagination
CREATE INDEX IF NOT EXISTS "idx_verifications_cursor"
  ON "verifications" ("org_id", "created_at" DESC, "id" DESC);

-- Batch jobs cursor pagination
CREATE INDEX IF NOT EXISTS "idx_batch_jobs_cursor"
  ON "batch_jobs" ("org_id", "created_at" DESC, "id" DESC);

-- Audit logs cursor pagination
CREATE INDEX IF NOT EXISTS "idx_audit_logs_cursor"
  ON "audit_logs" ("org_id", "created_at" DESC, "id" DESC);
