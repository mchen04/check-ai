-- Migration: Add webhook retry fields for QStash integration
-- This migration adds support for automatic retries, dead letter queue, and delivery tracking

-- Create the webhook delivery status enum
DO $$ BEGIN
    CREATE TYPE webhook_delivery_status AS ENUM (
        'pending',
        'processing',
        'delivered',
        'retrying',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to webhook_deliveries table
ALTER TABLE webhook_deliveries
    ADD COLUMN IF NOT EXISTS status webhook_delivery_status DEFAULT 'pending' NOT NULL,
    ADD COLUMN IF NOT EXISTS qstash_message_id TEXT,
    ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1 NOT NULL,
    ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 6 NOT NULL,
    ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS last_error TEXT,
    ADD COLUMN IF NOT EXISTS dlq_id TEXT,
    ADD COLUMN IF NOT EXISTS attempt_history JSONB,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP;

-- Rename delivered_at to be nullable and add proper default
-- (existing rows have delivered_at set, new rows will have created_at)
ALTER TABLE webhook_deliveries
    ALTER COLUMN delivered_at DROP NOT NULL;

-- Update existing successful deliveries to have 'delivered' status
UPDATE webhook_deliveries
SET status = 'delivered', delivered_at = COALESCE(delivered_at, created_at)
WHERE success = true;

-- Update existing failed deliveries to have 'failed' status
UPDATE webhook_deliveries
SET status = 'failed', failed_at = COALESCE(delivered_at, created_at)
WHERE success = false;

-- Create index for efficient status filtering
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_status ON webhook_deliveries(webhook_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);
