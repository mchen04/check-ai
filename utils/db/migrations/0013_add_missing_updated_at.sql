-- Migration: Add missing updated_at columns for 100% best practices compliance
-- This ensures all mutable tables have updated_at for tracking modifications
-- All statements are idempotent (safe to re-run)

-- =============================================================================
-- PART 1: ADD MISSING updated_at COLUMNS
-- =============================================================================

-- org_members: Roles can change
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'org_members' AND column_name = 'updated_at') THEN
    ALTER TABLE "org_members" ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL;
  END IF;
END $$;

-- org_invites: Status changes (pending -> accepted/expired/revoked)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'org_invites' AND column_name = 'updated_at') THEN
    ALTER TABLE "org_invites" ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL;
  END IF;
END $$;

-- api_keys: isActive, lastUsedAt change
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'updated_at') THEN
    ALTER TABLE "api_keys" ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL;
  END IF;
END $$;

-- verifications: Status changes during processing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verifications' AND column_name = 'updated_at') THEN
    ALTER TABLE "verifications" ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL;
  END IF;
END $$;

-- escalations: Resolution updates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'escalations' AND column_name = 'updated_at') THEN
    ALTER TABLE "escalations" ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL;
  END IF;
END $$;

-- webhook_deliveries: Status changes during retry attempts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'webhook_deliveries' AND column_name = 'updated_at') THEN
    ALTER TABLE "webhook_deliveries" ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL;
  END IF;
END $$;

-- batch_jobs: Status changes frequently during processing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_jobs' AND column_name = 'updated_at') THEN
    ALTER TABLE "batch_jobs" ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL;
  END IF;
END $$;

-- batch_items: Items updated during processing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_items' AND column_name = 'updated_at') THEN
    ALTER TABLE "batch_items" ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL;
  END IF;
END $$;

-- =============================================================================
-- PART 2: ADD AUTO-UPDATE TRIGGERS FOR NEW updated_at COLUMNS
-- =============================================================================
-- Uses the existing trigger_set_updated_at() function from migration 0011

DROP TRIGGER IF EXISTS set_updated_at_org_members ON "org_members";
CREATE TRIGGER set_updated_at_org_members
  BEFORE UPDATE ON "org_members"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_org_invites ON "org_invites";
CREATE TRIGGER set_updated_at_org_invites
  BEFORE UPDATE ON "org_invites"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_api_keys ON "api_keys";
CREATE TRIGGER set_updated_at_api_keys
  BEFORE UPDATE ON "api_keys"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_verifications ON "verifications";
CREATE TRIGGER set_updated_at_verifications
  BEFORE UPDATE ON "verifications"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_escalations ON "escalations";
CREATE TRIGGER set_updated_at_escalations
  BEFORE UPDATE ON "escalations"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_webhook_deliveries ON "webhook_deliveries";
CREATE TRIGGER set_updated_at_webhook_deliveries
  BEFORE UPDATE ON "webhook_deliveries"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_batch_jobs ON "batch_jobs";
CREATE TRIGGER set_updated_at_batch_jobs
  BEFORE UPDATE ON "batch_jobs"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_batch_items ON "batch_items";
CREATE TRIGGER set_updated_at_batch_items
  BEFORE UPDATE ON "batch_items"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- PART 3: ADD MISSING INDEX ON org_members.org_id
-- =============================================================================
-- While (org_id, user_id) composite PK exists, a dedicated index on org_id
-- improves queries that filter by org without specifying user

CREATE INDEX IF NOT EXISTS "idx_org_members_org_id" ON "org_members" ("org_id");

-- =============================================================================
-- PART 4: ADD INDEX FOR COMMON QUERY PATTERNS
-- =============================================================================

-- Verifications by status (common for processing queue)
CREATE INDEX IF NOT EXISTS "idx_verifications_status" ON "verifications" ("status")
  WHERE "deleted_at" IS NULL;

-- Escalations by resolution status (common for review queue)
CREATE INDEX IF NOT EXISTS "idx_escalations_unresolved" ON "escalations" ("created_at" DESC)
  WHERE "resolved_at" IS NULL;

-- Batch jobs by status (common for processing queue)
CREATE INDEX IF NOT EXISTS "idx_batch_jobs_status" ON "batch_jobs" ("status")
  WHERE "deleted_at" IS NULL;

-- Batch items by status within a batch
CREATE INDEX IF NOT EXISTS "idx_batch_items_batch_status" ON "batch_items" ("batch_id", "status");

-- Webhook deliveries pending retry
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_pending_retry" ON "webhook_deliveries" ("next_retry_at")
  WHERE "status" IN ('pending', 'retrying');

-- API keys by last used (for cleanup/analytics)
CREATE INDEX IF NOT EXISTS "idx_api_keys_last_used" ON "api_keys" ("last_used_at")
  WHERE "deleted_at" IS NULL AND "is_active" = true;

-- Org invites expiring soon (for cleanup jobs)
CREATE INDEX IF NOT EXISTS "idx_org_invites_expires" ON "org_invites" ("expires_at")
  WHERE "status" = 'pending';
