-- Migration: Create api_key_credentials junction table for multi-provider support
-- This enables API keys to have multiple provider credentials attached

-- Create junction table for API key to provider credentials mapping
CREATE TABLE "api_key_credentials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "api_key_id" uuid NOT NULL,
  "provider_credential_id" uuid NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Foreign keys with CASCADE delete
ALTER TABLE "api_key_credentials"
  ADD CONSTRAINT "api_key_credentials_api_key_id_fk"
  FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "api_key_credentials"
  ADD CONSTRAINT "api_key_credentials_provider_credential_id_fk"
  FOREIGN KEY ("provider_credential_id") REFERENCES "provider_credentials"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Unique: prevent duplicate credential assignments per API key
CREATE UNIQUE INDEX "api_key_credentials_unique"
  ON "api_key_credentials"("api_key_id", "provider_credential_id");

-- Partial unique: only one default per API key
CREATE UNIQUE INDEX "api_key_credentials_default_unique"
  ON "api_key_credentials"("api_key_id") WHERE "is_default" = true;

-- Index for credential lookups (find all API keys using a credential)
CREATE INDEX "idx_api_key_credentials_credential"
  ON "api_key_credentials"("provider_credential_id");

-- Index for API key lookups
CREATE INDEX "idx_api_key_credentials_api_key"
  ON "api_key_credentials"("api_key_id");

-- Migrate existing data: copy providerCredentialId to junction table
-- Mark existing credentials as default since they were the only credential
INSERT INTO "api_key_credentials" ("api_key_id", "provider_credential_id", "is_default")
SELECT "id", "provider_credential_id", true
FROM "api_keys"
WHERE "provider_credential_id" IS NOT NULL AND "deleted_at" IS NULL;
