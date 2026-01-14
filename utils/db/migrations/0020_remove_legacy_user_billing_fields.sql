-- Migration: Remove legacy user billing fields
--
-- These fields are no longer used as billing has moved to the organization level.
-- - plan: Was used for user-level billing, now uses organizations.plan_type
-- - stripe_id: Was user's Stripe customer ID, now uses organizations.stripe_customer_id
--
-- Safety: This migration only removes unused columns after verifying they're not queried.
-- The data can be backed up before running this migration if needed.

-- Step 1: Drop the legacy billing columns from users_table
ALTER TABLE "users_table" DROP COLUMN IF EXISTS "plan";
ALTER TABLE "users_table" DROP COLUMN IF EXISTS "stripe_id";

-- Note: If you need to rollback, the columns can be re-added with:
-- ALTER TABLE "users_table" ADD COLUMN "plan" text NOT NULL DEFAULT 'none';
-- ALTER TABLE "users_table" ADD COLUMN "stripe_id" text NOT NULL DEFAULT '';
