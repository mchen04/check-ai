-- Migration: Add indexes for provider_credentials table
-- Following best practices from production hardening

-- Index for org lookups
CREATE INDEX IF NOT EXISTS "idx_provider_credentials_org_id"
  ON "provider_credentials" ("org_id");

-- Index for active credentials lookup (excludes soft-deleted)
CREATE INDEX IF NOT EXISTS "idx_provider_credentials_org_active"
  ON "provider_credentials" ("org_id", "is_active")
  WHERE "deleted_at" IS NULL;

-- Unique index for credential names within org (among non-deleted)
CREATE UNIQUE INDEX IF NOT EXISTS "provider_credentials_org_name_unique_not_deleted"
  ON "provider_credentials" ("org_id", "name")
  WHERE "deleted_at" IS NULL;

-- Index for provider type lookups
CREATE INDEX IF NOT EXISTS "idx_provider_credentials_provider"
  ON "provider_credentials" ("provider")
  WHERE "deleted_at" IS NULL;

-- Auto-update trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at_provider_credentials ON "provider_credentials";
CREATE TRIGGER set_updated_at_provider_credentials
  BEFORE UPDATE ON "provider_credentials"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
