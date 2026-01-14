-- Migration: Remove legacy QStash fields
-- These columns are no longer needed as we've migrated to Trigger.dev

ALTER TABLE "batch_jobs" DROP COLUMN IF EXISTS "qstash_message_ids";--> statement-breakpoint
ALTER TABLE "webhook_deliveries" DROP COLUMN IF EXISTS "qstash_message_id";--> statement-breakpoint
ALTER TABLE "webhook_deliveries" DROP COLUMN IF EXISTS "success";
