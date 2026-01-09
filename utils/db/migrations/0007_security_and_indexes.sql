-- Migration: Enable RLS and add indexes on foreign keys
-- This blocks PostgREST access (security) and improves query performance

-- =============================================================================
-- PART 1: Enable Row Level Security on all tables
-- =============================================================================
-- With RLS enabled and NO policies, PostgREST access is blocked.
-- Service role key (used by Drizzle) bypasses RLS, so server-side code works.

ALTER TABLE "users_table" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "org_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "org_invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "paradigm_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "escalations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "batch_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "batch_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhooks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhook_deliveries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics_daily_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "waitlist" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PART 2: Add indexes on foreign keys for query performance
-- =============================================================================

-- Organizations lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS "idx_verifications_org_id" ON "verifications" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_api_keys_org_id" ON "api_keys" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_batch_jobs_org_id" ON "batch_jobs" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_webhooks_org_id" ON "webhooks" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_usage_org_id" ON "usage" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_org_id" ON "audit_logs" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_analytics_daily_snapshots_org_id" ON "analytics_daily_snapshots" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_user_preferences_org_id" ON "user_preferences" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_org_invites_org_id" ON "org_invites" ("org_id");

-- Verification lookups (for fetching related data)
CREATE INDEX IF NOT EXISTS "idx_paradigm_results_verification_id" ON "paradigm_results" ("verification_id");
CREATE INDEX IF NOT EXISTS "idx_escalations_verification_id" ON "escalations" ("verification_id");
CREATE INDEX IF NOT EXISTS "idx_usage_verification_id" ON "usage" ("verification_id");
CREATE INDEX IF NOT EXISTS "idx_batch_items_verification_id" ON "batch_items" ("verification_id");

-- Batch lookups
CREATE INDEX IF NOT EXISTS "idx_batch_items_batch_id" ON "batch_items" ("batch_id");

-- Webhook lookups
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_webhook_id" ON "webhook_deliveries" ("webhook_id");

-- User lookups
CREATE INDEX IF NOT EXISTS "idx_org_members_user_id" ON "org_members" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_org_invites_invited_by" ON "org_invites" ("invited_by");
CREATE INDEX IF NOT EXISTS "idx_escalations_resolved_by" ON "escalations" ("resolved_by");
