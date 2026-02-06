-- Migration 0022: Enable RLS on all public tables, add missing FK indexes,
-- drop duplicate index, and fix function search_path.
--
-- Context: Migration 0007 defined these changes but was never applied to
-- either DEV or PROD. RLS is currently disabled on all 18 public tables,
-- meaning PostgREST (anon key) has unrestricted access to all data.
--
-- Safety: Our app uses Drizzle via DATABASE_URL (postgres superuser) which
-- bypasses RLS. Supabase Auth uses the auth.* schema, not public.*.

-- ============================================================================
-- PART A: Enable Row Level Security on all public tables (17 active tables)
-- ============================================================================
-- No policies are added — this means PostgREST/anon key access is fully blocked.
-- The waitlist table was dropped in migration 0021, so we skip it.

ALTER TABLE "users_table" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "org_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "org_invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "provider_credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_key_credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "paradigm_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "escalations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhooks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhook_deliveries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "batch_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "batch_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics_daily_snapshots" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART B: Add missing FK indexes (IF NOT EXISTS for idempotency)
-- ============================================================================
-- These indexes optimize JOIN and WHERE queries on foreign key columns.
-- PROD already has most of these; DEV is missing ~27.

-- org_id indexes (9 tables)
CREATE INDEX IF NOT EXISTS "idx_org_members_org_id" ON "org_members" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_org_invites_org_id" ON "org_invites" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_provider_credentials_org_id" ON "provider_credentials" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_api_keys_org_id" ON "api_keys" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_verifications_org_id" ON "verifications" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_usage_org_id" ON "usage" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_webhooks_org_id" ON "webhooks" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_org_id" ON "audit_logs" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_batch_jobs_org_id" ON "batch_jobs" ("org_id");

-- user_id indexes
CREATE INDEX IF NOT EXISTS "idx_org_members_user_id" ON "org_members" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_preferences_user_id" ON "user_preferences" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_preferences_org_id" ON "user_preferences" ("org_id");

-- verification_id indexes
CREATE INDEX IF NOT EXISTS "idx_paradigm_results_verification_id" ON "paradigm_results" ("verification_id");
CREATE INDEX IF NOT EXISTS "idx_escalations_verification_id" ON "escalations" ("verification_id");
CREATE INDEX IF NOT EXISTS "idx_usage_verification_id" ON "usage" ("verification_id");
CREATE INDEX IF NOT EXISTS "idx_batch_items_verification_id" ON "batch_items" ("verification_id");

-- Other FK indexes
CREATE INDEX IF NOT EXISTS "idx_org_invites_invited_by" ON "org_invites" ("invited_by");
CREATE INDEX IF NOT EXISTS "idx_escalations_resolved_by" ON "escalations" ("resolved_by");
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_webhook_id" ON "webhook_deliveries" ("webhook_id");
CREATE INDEX IF NOT EXISTS "idx_batch_items_batch_id" ON "batch_items" ("batch_id");
CREATE INDEX IF NOT EXISTS "idx_analytics_daily_snapshots_org_id" ON "analytics_daily_snapshots" ("org_id");

-- api_key_credentials FK indexes
CREATE INDEX IF NOT EXISTS "idx_api_key_credentials_api_key_id" ON "api_key_credentials" ("api_key_id");
CREATE INDEX IF NOT EXISTS "idx_api_key_credentials_provider_credential_id" ON "api_key_credentials" ("provider_credential_id");

-- ============================================================================
-- PART C: Drop duplicate index
-- ============================================================================
-- idx_daily_snapshots_org_id is a duplicate of idx_analytics_daily_snapshots_org_id
DROP INDEX IF EXISTS "idx_daily_snapshots_org_id";

-- ============================================================================
-- PART D: Fix function search_path (security best practice)
-- ============================================================================
-- Supabase advisor flags mutable search_path as a security risk.
-- SET search_path = '' ensures functions cannot be tricked via schema injection.

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql SET search_path = '';
