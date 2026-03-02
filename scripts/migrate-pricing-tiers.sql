-- Pricing Tier Migration
-- Migrates existing organizations to new plan limits:
--   Free:       1,000 verifications/month, 7-day retention
--   Pro:       25,000 verifications/month, 30-day retention
--   Enterprise: unchanged (already unlimited)
--
-- Run this AFTER deploying the code changes.
-- Safe to run multiple times (idempotent).

BEGIN;

-- Free tier: 100 → 1,000 verifications, 30 → 7 day retention
UPDATE organizations
SET verifications_limit = 1000,
    verification_retention_days = 7,
    updated_at = NOW()
WHERE plan_type = 'free';

-- Pro tier: 5,000 → 25,000 verifications, ensure 30-day retention
UPDATE organizations
SET verifications_limit = 25000,
    verification_retention_days = 30,
    updated_at = NOW()
WHERE plan_type = 'pro';

-- Enterprise: keep unlimited (1,000,000 sentinel), set 90-day retention
UPDATE organizations
SET verification_retention_days = 90,
    updated_at = NOW()
WHERE plan_type = 'enterprise';

COMMIT;
