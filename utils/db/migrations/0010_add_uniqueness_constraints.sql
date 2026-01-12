-- Migration: Add uniqueness constraints to prevent duplicate records
-- These constraints enforce data integrity at the database level

-- =============================================================================
-- API Keys: Prevent duplicate key hashes (critical for security)
-- =============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_key_hash_unique'
  ) THEN
    ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_key_hash_unique" UNIQUE ("key_hash");
  END IF;
END $$;

-- API Keys: Prevent duplicate names within same org (UX improvement)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_org_name_unique'
  ) THEN
    ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_org_name_unique" UNIQUE ("org_id", "name");
  END IF;
END $$;

-- =============================================================================
-- Organizations: Prevent duplicate Stripe IDs (billing integrity)
-- =============================================================================
-- Use partial unique index since these can be NULL
CREATE UNIQUE INDEX IF NOT EXISTS "idx_organizations_stripe_customer_unique"
  ON "organizations" ("stripe_customer_id")
  WHERE "stripe_customer_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_organizations_stripe_subscription_unique"
  ON "organizations" ("stripe_subscription_id")
  WHERE "stripe_subscription_id" IS NOT NULL;

-- =============================================================================
-- Org Invites: Prevent duplicate pending invites to same email per org
-- =============================================================================
-- Only one pending invite per email per org
CREATE UNIQUE INDEX IF NOT EXISTS "idx_org_invites_org_email_pending_unique"
  ON "org_invites" ("org_id", "email")
  WHERE "status" = 'pending';

-- =============================================================================
-- Webhooks: Prevent duplicate webhook URLs per org
-- =============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'webhooks_org_url_unique'
  ) THEN
    ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_org_url_unique" UNIQUE ("org_id", "url");
  END IF;
END $$;

-- =============================================================================
-- Batch Items: Prevent duplicate idempotency keys within same batch
-- =============================================================================
-- Only apply where idempotency_key is set
CREATE UNIQUE INDEX IF NOT EXISTS "idx_batch_items_batch_idempotency_unique"
  ON "batch_items" ("batch_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

-- =============================================================================
-- Verifications: Scope idempotency key to org (currently global)
-- =============================================================================
-- Drop the old global unique constraint and add org-scoped one
-- This allows different orgs to use the same idempotency keys
DO $$ BEGIN
  -- Check if the old constraint exists before trying to drop
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'verifications_idempotency_key_unique'
  ) THEN
    ALTER TABLE "verifications" DROP CONSTRAINT "verifications_idempotency_key_unique";
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_verifications_org_idempotency_unique"
  ON "verifications" ("org_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;
