-- Migration: Add Trigger.dev task ID columns
-- Replaces QStash with Trigger.dev for background job processing

-- Add trigger_task_id to webhook_deliveries
ALTER TABLE webhook_deliveries
ADD COLUMN IF NOT EXISTS trigger_task_id TEXT;

-- Add trigger_task_ids to batch_jobs
ALTER TABLE batch_jobs
ADD COLUMN IF NOT EXISTS trigger_task_ids TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN webhook_deliveries.trigger_task_id IS 'Trigger.dev task ID for webhook delivery';
COMMENT ON COLUMN batch_jobs.trigger_task_ids IS 'Trigger.dev task IDs for batch item processing';
