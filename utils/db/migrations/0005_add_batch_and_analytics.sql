-- Add batch processing enums
DO $$ BEGIN
 CREATE TYPE "public"."batch_status" AS ENUM('pending', 'validating', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."batch_item_status" AS ENUM('pending', 'queued', 'processing', 'completed', 'failed', 'skipped');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Add batch event types to audit_event_type enum
ALTER TYPE "public"."audit_event_type" ADD VALUE IF NOT EXISTS 'batch.created';
ALTER TYPE "public"."audit_event_type" ADD VALUE IF NOT EXISTS 'batch.completed';
ALTER TYPE "public"."audit_event_type" ADD VALUE IF NOT EXISTS 'batch.failed';
ALTER TYPE "public"."audit_event_type" ADD VALUE IF NOT EXISTS 'batch.cancelled';
--> statement-breakpoint

-- Create batch_jobs table
CREATE TABLE IF NOT EXISTS "batch_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text,
	"input_format" text NOT NULL,
	"original_file_name" text,
	"methods_config" jsonb NOT NULL,
	"context" jsonb,
	"status" "batch_status" DEFAULT 'pending' NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"processed_items" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"qstash_message_ids" text[],
	"error_message" text,
	"validation_errors" jsonb,
	"total_cost_cents" integer DEFAULT 0 NOT NULL,
	"total_input_tokens" integer DEFAULT 0 NOT NULL,
	"total_output_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"expires_at" timestamp
);
--> statement-breakpoint

-- Create batch_items table
CREATE TABLE IF NOT EXISTS "batch_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"item_index" integer NOT NULL,
	"idempotency_key" text,
	"content" text NOT NULL,
	"item_context" jsonb,
	"status" "batch_item_status" DEFAULT 'pending' NOT NULL,
	"verification_id" uuid,
	"verdict" text,
	"confidence" numeric(5, 4),
	"decision" text,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"cost_cents" integer,
	"processing_time_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint

-- Create analytics_daily_snapshots table
CREATE TABLE IF NOT EXISTS "analytics_daily_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"paradigm_type" "paradigm_type" NOT NULL,
	"total_verifications" integer DEFAULT 0 NOT NULL,
	"escalated_count" integer DEFAULT 0 NOT NULL,
	"resolved_count" integer DEFAULT 0 NOT NULL,
	"false_positives" integer DEFAULT 0 NOT NULL,
	"true_positives" integer DEFAULT 0 NOT NULL,
	"confidence_buckets" jsonb,
	"total_cost_cents" integer DEFAULT 0 NOT NULL,
	"avg_cost_per_verification" numeric(10, 4),
	"avg_cost_per_accurate" numeric(10, 4),
	"avg_confidence" numeric(5, 4),
	"avg_processing_time_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "batch_jobs" ADD CONSTRAINT "batch_jobs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_batch_id_batch_jobs_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batch_jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_verification_id_verifications_id_fk" FOREIGN KEY ("verification_id") REFERENCES "public"."verifications"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analytics_daily_snapshots" ADD CONSTRAINT "analytics_daily_snapshots_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Create indexes for batch_jobs
CREATE INDEX IF NOT EXISTS idx_batch_jobs_org_id ON batch_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_org_status ON batch_jobs(org_id, status);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_created_at ON batch_jobs(created_at DESC);
--> statement-breakpoint

-- Create indexes for batch_items
CREATE INDEX IF NOT EXISTS idx_batch_items_batch_id ON batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_items_status ON batch_items(status);
CREATE INDEX IF NOT EXISTS idx_batch_items_batch_status ON batch_items(batch_id, status);
CREATE INDEX IF NOT EXISTS idx_batch_items_verification_id ON batch_items(verification_id);
CREATE INDEX IF NOT EXISTS idx_batch_items_results ON batch_items(batch_id, status, completed_at DESC);
--> statement-breakpoint

-- Create indexes for analytics_daily_snapshots
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_snapshots_org_date_paradigm ON analytics_daily_snapshots(org_id, date, paradigm_type);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_org_id ON analytics_daily_snapshots(org_id);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date ON analytics_daily_snapshots(date);
--> statement-breakpoint

-- Create indexes for advanced analytics queries on existing tables
CREATE INDEX IF NOT EXISTS idx_paradigm_results_verification_type ON paradigm_results(verification_id, paradigm_type);
CREATE INDEX IF NOT EXISTS idx_verifications_org_created ON verifications(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_escalations_verification_resolved ON escalations(verification_id, resolved_at, human_verdict);
