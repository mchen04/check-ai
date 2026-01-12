-- Migration: TIMESTAMPTZ and Soft Delete
-- 1. Convert all timestamp columns to timestamptz for timezone safety
-- 2. Add deleted_at columns for soft delete on key tables

-- =============================================================================
-- PART 1: CONVERT TIMESTAMP TO TIMESTAMPTZ
-- =============================================================================
-- PostgreSQL automatically converts existing values, assuming they are in the
-- server's timezone. For UTC servers, this is seamless.

-- Organizations
ALTER TABLE "organizations"
  ALTER COLUMN "billing_cycle_start" TYPE TIMESTAMPTZ USING "billing_cycle_start" AT TIME ZONE 'UTC',
  ALTER COLUMN "billing_cycle_end" TYPE TIMESTAMPTZ USING "billing_cycle_end" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'UTC';

-- Org Members
ALTER TABLE "org_members"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC';

-- Org Invites
ALTER TABLE "org_invites"
  ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ USING "expires_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "accepted_at" TYPE TIMESTAMPTZ USING "accepted_at" AT TIME ZONE 'UTC';

-- API Keys
ALTER TABLE "api_keys"
  ALTER COLUMN "last_used_at" TYPE TIMESTAMPTZ USING "last_used_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ USING "expires_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC';

-- Verifications
ALTER TABLE "verifications"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "completed_at" TYPE TIMESTAMPTZ USING "completed_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ USING "expires_at" AT TIME ZONE 'UTC';

-- Paradigm Results
ALTER TABLE "paradigm_results"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC';

-- Escalations
ALTER TABLE "escalations"
  ALTER COLUMN "deadline" TYPE TIMESTAMPTZ USING "deadline" AT TIME ZONE 'UTC',
  ALTER COLUMN "resolved_at" TYPE TIMESTAMPTZ USING "resolved_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC';

-- Usage
ALTER TABLE "usage"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC';

-- Webhooks
ALTER TABLE "webhooks"
  ALTER COLUMN "last_triggered_at" TYPE TIMESTAMPTZ USING "last_triggered_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'UTC';

-- Webhook Deliveries
ALTER TABLE "webhook_deliveries"
  ALTER COLUMN "next_retry_at" TYPE TIMESTAMPTZ USING "next_retry_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "delivered_at" TYPE TIMESTAMPTZ USING "delivered_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "failed_at" TYPE TIMESTAMPTZ USING "failed_at" AT TIME ZONE 'UTC';

-- User Preferences
ALTER TABLE "user_preferences"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'UTC';

-- Audit Logs
ALTER TABLE "audit_logs"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC';

-- Batch Jobs
ALTER TABLE "batch_jobs"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "started_at" TYPE TIMESTAMPTZ USING "started_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "completed_at" TYPE TIMESTAMPTZ USING "completed_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ USING "expires_at" AT TIME ZONE 'UTC';

-- Batch Items
ALTER TABLE "batch_items"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "started_at" TYPE TIMESTAMPTZ USING "started_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "completed_at" TYPE TIMESTAMPTZ USING "completed_at" AT TIME ZONE 'UTC';

-- Analytics Daily Snapshots
ALTER TABLE "analytics_daily_snapshots"
  ALTER COLUMN "date" TYPE TIMESTAMPTZ USING "date" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'UTC';

-- Waitlist
ALTER TABLE "waitlist"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC';

-- =============================================================================
-- PART 2: ADD SOFT DELETE COLUMNS
-- =============================================================================
-- Adding deleted_at allows recovery of accidentally deleted records
-- and maintains audit trail. When set, record is considered "deleted".

-- API Keys: Allow recovery of deleted keys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'deleted_at') THEN
    ALTER TABLE "api_keys" ADD COLUMN "deleted_at" TIMESTAMPTZ;
  END IF;
END $$;

-- Verifications: Maintain history for debugging/audit
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verifications' AND column_name = 'deleted_at') THEN
    ALTER TABLE "verifications" ADD COLUMN "deleted_at" TIMESTAMPTZ;
  END IF;
END $$;

-- Webhooks: Allow recovery of deleted webhooks
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'webhooks' AND column_name = 'deleted_at') THEN
    ALTER TABLE "webhooks" ADD COLUMN "deleted_at" TIMESTAMPTZ;
  END IF;
END $$;

-- Batch Jobs: Maintain history for debugging
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_jobs' AND column_name = 'deleted_at') THEN
    ALTER TABLE "batch_jobs" ADD COLUMN "deleted_at" TIMESTAMPTZ;
  END IF;
END $$;

-- =============================================================================
-- PART 3: PARTIAL INDEXES FOR SOFT DELETE
-- =============================================================================
-- These indexes only include non-deleted records for efficient queries
-- Existing queries will automatically benefit from these

-- API Keys: Active non-deleted keys
DROP INDEX IF EXISTS "idx_api_keys_org_active";
CREATE INDEX IF NOT EXISTS "idx_api_keys_org_active_not_deleted"
  ON "api_keys" ("org_id", "key_hash")
  WHERE "is_active" = true AND "deleted_at" IS NULL;

-- API Keys: Hash lookup for non-deleted
DROP INDEX IF EXISTS "idx_api_keys_hash";
CREATE INDEX IF NOT EXISTS "idx_api_keys_hash_not_deleted"
  ON "api_keys" ("key_hash")
  WHERE "is_active" = true AND "deleted_at" IS NULL;

-- Verifications: Non-deleted by org
CREATE INDEX IF NOT EXISTS "idx_verifications_org_not_deleted"
  ON "verifications" ("org_id", "created_at" DESC)
  WHERE "deleted_at" IS NULL;

-- Webhooks: Active non-deleted
DROP INDEX IF EXISTS "idx_webhooks_org_active";
CREATE INDEX IF NOT EXISTS "idx_webhooks_org_active_not_deleted"
  ON "webhooks" ("org_id")
  WHERE "is_active" = true AND "deleted_at" IS NULL;

-- Batch Jobs: Non-deleted by org
CREATE INDEX IF NOT EXISTS "idx_batch_jobs_org_not_deleted"
  ON "batch_jobs" ("org_id", "created_at" DESC)
  WHERE "deleted_at" IS NULL;

-- =============================================================================
-- PART 4: UNIQUE CONSTRAINTS UPDATE FOR SOFT DELETE
-- =============================================================================
-- Update unique constraints to only apply to non-deleted records

-- API Keys: key_hash should only be unique among non-deleted
-- First drop the constraint (which also drops the index)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_key_hash_unique') THEN
    ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_key_hash_unique";
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_key_hash_unique_not_deleted"
  ON "api_keys" ("key_hash")
  WHERE "deleted_at" IS NULL;

-- API Keys: org_name should only be unique among non-deleted
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_org_name_unique') THEN
    ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_org_name_unique";
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_org_name_unique_not_deleted"
  ON "api_keys" ("org_id", "name")
  WHERE "deleted_at" IS NULL;

-- Webhooks: org_url should only be unique among non-deleted
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'webhooks_org_url_unique') THEN
    ALTER TABLE "webhooks" DROP CONSTRAINT "webhooks_org_url_unique";
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "webhooks_org_url_unique_not_deleted"
  ON "webhooks" ("org_id", "url")
  WHERE "deleted_at" IS NULL;
