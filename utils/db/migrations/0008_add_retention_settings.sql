-- Add data retention settings to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS verification_retention_days INTEGER DEFAULT 30 NOT NULL,
ADD COLUMN IF NOT EXISTS batch_retention_days INTEGER DEFAULT 30 NOT NULL,
ADD COLUMN IF NOT EXISTS data_retention_enabled BOOLEAN DEFAULT TRUE NOT NULL;

-- Add expiresAt to verifications for automatic cleanup
ALTER TABLE verifications
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Add index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_verifications_expires_at
ON verifications(expires_at) WHERE expires_at IS NOT NULL;

-- Backfill existing verifications with 30-day expiration
UPDATE verifications
SET expires_at = created_at + INTERVAL '30 days'
WHERE expires_at IS NULL;
