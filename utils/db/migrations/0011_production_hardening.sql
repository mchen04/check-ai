-- Migration: Production Database Hardening
-- Implements comprehensive best practices for a production-ready database
-- Based on PostgreSQL 2025 best practices research
-- All statements are idempotent (safe to re-run)

-- =============================================================================
-- PART 1: CHECK CONSTRAINTS FOR DATA VALIDATION
-- =============================================================================

-- Helper function to add constraint if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_organizations_verifications_used_positive') THEN
    ALTER TABLE "organizations" ADD CONSTRAINT "chk_organizations_verifications_used_positive" CHECK ("verifications_used" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_organizations_verifications_limit_positive') THEN
    ALTER TABLE "organizations" ADD CONSTRAINT "chk_organizations_verifications_limit_positive" CHECK ("verifications_limit" > 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_organizations_auto_escalate_threshold_range') THEN
    ALTER TABLE "organizations" ADD CONSTRAINT "chk_organizations_auto_escalate_threshold_range" CHECK ("auto_escalate_threshold" >= 0 AND "auto_escalate_threshold" <= 1);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_organizations_verification_retention_positive') THEN
    ALTER TABLE "organizations" ADD CONSTRAINT "chk_organizations_verification_retention_positive" CHECK ("verification_retention_days" > 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_organizations_batch_retention_positive') THEN
    ALTER TABLE "organizations" ADD CONSTRAINT "chk_organizations_batch_retention_positive" CHECK ("batch_retention_days" > 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_verifications_confidence_range') THEN
    ALTER TABLE "verifications" ADD CONSTRAINT "chk_verifications_confidence_range" CHECK ("confidence_score" IS NULL OR ("confidence_score" >= 0 AND "confidence_score" <= 1));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_verifications_processing_time_positive') THEN
    ALTER TABLE "verifications" ADD CONSTRAINT "chk_verifications_processing_time_positive" CHECK ("processing_time_ms" IS NULL OR "processing_time_ms" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_verifications_cost_positive') THEN
    ALTER TABLE "verifications" ADD CONSTRAINT "chk_verifications_cost_positive" CHECK ("cost_cents" IS NULL OR "cost_cents" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_verifications_verdict_values') THEN
    ALTER TABLE "verifications" ADD CONSTRAINT "chk_verifications_verdict_values" CHECK ("final_verdict" IS NULL OR "final_verdict" IN ('true', 'false', 'uncertain'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_verifications_decision_values') THEN
    ALTER TABLE "verifications" ADD CONSTRAINT "chk_verifications_decision_values" CHECK ("decision" IS NULL OR "decision" IN ('accept', 'refine', 'escalate', 'reject'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_paradigm_results_weight_range') THEN
    ALTER TABLE "paradigm_results" ADD CONSTRAINT "chk_paradigm_results_weight_range" CHECK ("weight" >= 0 AND "weight" <= 1);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_paradigm_results_confidence_range') THEN
    ALTER TABLE "paradigm_results" ADD CONSTRAINT "chk_paradigm_results_confidence_range" CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_paradigm_results_processing_time_positive') THEN
    ALTER TABLE "paradigm_results" ADD CONSTRAINT "chk_paradigm_results_processing_time_positive" CHECK ("processing_time_ms" IS NULL OR "processing_time_ms" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_paradigm_results_cost_positive') THEN
    ALTER TABLE "paradigm_results" ADD CONSTRAINT "chk_paradigm_results_cost_positive" CHECK ("cost_cents" IS NULL OR "cost_cents" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_paradigm_results_verdict_values') THEN
    ALTER TABLE "paradigm_results" ADD CONSTRAINT "chk_paradigm_results_verdict_values" CHECK ("verdict" IS NULL OR "verdict" IN ('true', 'false', 'uncertain'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_escalations_priority_range') THEN
    ALTER TABLE "escalations" ADD CONSTRAINT "chk_escalations_priority_range" CHECK ("priority" >= 1 AND "priority" <= 3);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_escalations_verdict_values') THEN
    ALTER TABLE "escalations" ADD CONSTRAINT "chk_escalations_verdict_values" CHECK ("human_verdict" IS NULL OR "human_verdict" IN ('true', 'false', 'uncertain'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_usage_input_tokens_positive') THEN
    ALTER TABLE "usage" ADD CONSTRAINT "chk_usage_input_tokens_positive" CHECK ("input_tokens" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_usage_output_tokens_positive') THEN
    ALTER TABLE "usage" ADD CONSTRAINT "chk_usage_output_tokens_positive" CHECK ("output_tokens" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_usage_cost_positive') THEN
    ALTER TABLE "usage" ADD CONSTRAINT "chk_usage_cost_positive" CHECK ("cost_cents" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_webhooks_failure_count_positive') THEN
    ALTER TABLE "webhooks" ADD CONSTRAINT "chk_webhooks_failure_count_positive" CHECK ("failure_count" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_webhooks_last_status_valid') THEN
    ALTER TABLE "webhooks" ADD CONSTRAINT "chk_webhooks_last_status_valid" CHECK ("last_status" IS NULL OR ("last_status" >= 100 AND "last_status" < 600));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_webhook_deliveries_attempt_number_positive') THEN
    ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "chk_webhook_deliveries_attempt_number_positive" CHECK ("attempt_number" >= 1);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_webhook_deliveries_max_attempts_positive') THEN
    ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "chk_webhook_deliveries_max_attempts_positive" CHECK ("max_attempts" >= 1);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_webhook_deliveries_duration_positive') THEN
    ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "chk_webhook_deliveries_duration_positive" CHECK ("duration_ms" IS NULL OR "duration_ms" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_webhook_deliveries_response_status_valid') THEN
    ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "chk_webhook_deliveries_response_status_valid" CHECK ("response_status" IS NULL OR ("response_status" >= 100 AND "response_status" < 600));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_jobs_total_items_positive') THEN
    ALTER TABLE "batch_jobs" ADD CONSTRAINT "chk_batch_jobs_total_items_positive" CHECK ("total_items" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_jobs_processed_items_positive') THEN
    ALTER TABLE "batch_jobs" ADD CONSTRAINT "chk_batch_jobs_processed_items_positive" CHECK ("processed_items" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_jobs_success_count_positive') THEN
    ALTER TABLE "batch_jobs" ADD CONSTRAINT "chk_batch_jobs_success_count_positive" CHECK ("success_count" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_jobs_failure_count_positive') THEN
    ALTER TABLE "batch_jobs" ADD CONSTRAINT "chk_batch_jobs_failure_count_positive" CHECK ("failure_count" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_jobs_cost_positive') THEN
    ALTER TABLE "batch_jobs" ADD CONSTRAINT "chk_batch_jobs_cost_positive" CHECK ("total_cost_cents" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_jobs_tokens_positive') THEN
    ALTER TABLE "batch_jobs" ADD CONSTRAINT "chk_batch_jobs_tokens_positive" CHECK ("total_input_tokens" >= 0 AND "total_output_tokens" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_jobs_input_format_values') THEN
    ALTER TABLE "batch_jobs" ADD CONSTRAINT "chk_batch_jobs_input_format_values" CHECK ("input_format" IN ('json', 'csv'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_items_item_index_positive') THEN
    ALTER TABLE "batch_items" ADD CONSTRAINT "chk_batch_items_item_index_positive" CHECK ("item_index" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_items_retry_count_positive') THEN
    ALTER TABLE "batch_items" ADD CONSTRAINT "chk_batch_items_retry_count_positive" CHECK ("retry_count" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_items_cost_positive') THEN
    ALTER TABLE "batch_items" ADD CONSTRAINT "chk_batch_items_cost_positive" CHECK ("cost_cents" IS NULL OR "cost_cents" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_items_confidence_range') THEN
    ALTER TABLE "batch_items" ADD CONSTRAINT "chk_batch_items_confidence_range" CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_items_verdict_values') THEN
    ALTER TABLE "batch_items" ADD CONSTRAINT "chk_batch_items_verdict_values" CHECK ("verdict" IS NULL OR "verdict" IN ('true', 'false', 'uncertain'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_items_decision_values') THEN
    ALTER TABLE "batch_items" ADD CONSTRAINT "chk_batch_items_decision_values" CHECK ("decision" IS NULL OR "decision" IN ('accept', 'refine', 'escalate', 'reject'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_analytics_total_verifications_positive') THEN
    ALTER TABLE "analytics_daily_snapshots" ADD CONSTRAINT "chk_analytics_total_verifications_positive" CHECK ("total_verifications" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_analytics_escalated_count_positive') THEN
    ALTER TABLE "analytics_daily_snapshots" ADD CONSTRAINT "chk_analytics_escalated_count_positive" CHECK ("escalated_count" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_analytics_resolved_count_positive') THEN
    ALTER TABLE "analytics_daily_snapshots" ADD CONSTRAINT "chk_analytics_resolved_count_positive" CHECK ("resolved_count" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_analytics_false_positives_positive') THEN
    ALTER TABLE "analytics_daily_snapshots" ADD CONSTRAINT "chk_analytics_false_positives_positive" CHECK ("false_positives" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_analytics_true_positives_positive') THEN
    ALTER TABLE "analytics_daily_snapshots" ADD CONSTRAINT "chk_analytics_true_positives_positive" CHECK ("true_positives" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_analytics_cost_positive') THEN
    ALTER TABLE "analytics_daily_snapshots" ADD CONSTRAINT "chk_analytics_cost_positive" CHECK ("total_cost_cents" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_analytics_avg_confidence_range') THEN
    ALTER TABLE "analytics_daily_snapshots" ADD CONSTRAINT "chk_analytics_avg_confidence_range" CHECK ("avg_confidence" IS NULL OR ("avg_confidence" >= 0 AND "avg_confidence" <= 1));
  END IF;
END $$;

-- =============================================================================
-- PART 2: EMAIL VALIDATION CONSTRAINTS
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_email_format') THEN
    ALTER TABLE "users_table" ADD CONSTRAINT "chk_users_email_format" CHECK ("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_org_invites_email_format') THEN
    ALTER TABLE "org_invites" ADD CONSTRAINT "chk_org_invites_email_format" CHECK ("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_waitlist_email_format') THEN
    ALTER TABLE "waitlist" ADD CONSTRAINT "chk_waitlist_email_format" CHECK ("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

-- =============================================================================
-- PART 3: URL VALIDATION CONSTRAINTS
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_webhooks_url_format') THEN
    ALTER TABLE "webhooks" ADD CONSTRAINT "chk_webhooks_url_format" CHECK ("url" ~* '^https?://[^\s/$.?#].[^\s]*$');
  END IF;
END $$;

-- =============================================================================
-- PART 4: SLUG VALIDATION
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_organizations_slug_format') THEN
    ALTER TABLE "organizations" ADD CONSTRAINT "chk_organizations_slug_format" CHECK ("slug" ~* '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR "slug" ~* '^[a-z0-9]$');
  END IF;
END $$;

-- =============================================================================
-- PART 5: API KEY PREFIX VALIDATION
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_api_keys_prefix_format') THEN
    ALTER TABLE "api_keys" ADD CONSTRAINT "chk_api_keys_prefix_format" CHECK ("key_prefix" ~* '^[a-z]{2,4}_[a-zA-Z0-9]{4,}$');
  END IF;
END $$;

-- =============================================================================
-- PART 6: CONTENT LENGTH CONSTRAINTS
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_verifications_content_length') THEN
    ALTER TABLE "verifications" ADD CONSTRAINT "chk_verifications_content_length" CHECK (length("content") > 0 AND length("content") <= 100000);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_items_content_length') THEN
    ALTER TABLE "batch_items" ADD CONSTRAINT "chk_batch_items_content_length" CHECK (length("content") > 0 AND length("content") <= 100000);
  END IF;
END $$;

-- =============================================================================
-- PART 7: TIMESTAMP CONSISTENCY CONSTRAINTS
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_verifications_completed_after_created') THEN
    ALTER TABLE "verifications" ADD CONSTRAINT "chk_verifications_completed_after_created" CHECK ("completed_at" IS NULL OR "completed_at" >= "created_at");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_jobs_started_after_created') THEN
    ALTER TABLE "batch_jobs" ADD CONSTRAINT "chk_batch_jobs_started_after_created" CHECK ("started_at" IS NULL OR "started_at" >= "created_at");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_jobs_completed_after_started') THEN
    ALTER TABLE "batch_jobs" ADD CONSTRAINT "chk_batch_jobs_completed_after_started" CHECK ("completed_at" IS NULL OR "started_at" IS NULL OR "completed_at" >= "started_at");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_items_started_after_created') THEN
    ALTER TABLE "batch_items" ADD CONSTRAINT "chk_batch_items_started_after_created" CHECK ("started_at" IS NULL OR "started_at" >= "created_at");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_items_completed_after_started') THEN
    ALTER TABLE "batch_items" ADD CONSTRAINT "chk_batch_items_completed_after_started" CHECK ("completed_at" IS NULL OR "started_at" IS NULL OR "completed_at" >= "started_at");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_org_invites_expires_after_created') THEN
    ALTER TABLE "org_invites" ADD CONSTRAINT "chk_org_invites_expires_after_created" CHECK ("expires_at" > "created_at");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_org_invites_accepted_after_created') THEN
    ALTER TABLE "org_invites" ADD CONSTRAINT "chk_org_invites_accepted_after_created" CHECK ("accepted_at" IS NULL OR "accepted_at" >= "created_at");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_escalations_resolved_after_created') THEN
    ALTER TABLE "escalations" ADD CONSTRAINT "chk_escalations_resolved_after_created" CHECK ("resolved_at" IS NULL OR "resolved_at" >= "created_at");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_webhook_deliveries_delivered_after_created') THEN
    ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "chk_webhook_deliveries_delivered_after_created" CHECK ("delivered_at" IS NULL OR "delivered_at" >= "created_at");
  END IF;
END $$;

-- =============================================================================
-- PART 8: AUTO-UPDATE TRIGGERS FOR updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_organizations ON "organizations";
CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON "organizations"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_webhooks ON "webhooks";
CREATE TRIGGER set_updated_at_webhooks
  BEFORE UPDATE ON "webhooks"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_user_preferences ON "user_preferences";
CREATE TRIGGER set_updated_at_user_preferences
  BEFORE UPDATE ON "user_preferences"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_analytics ON "analytics_daily_snapshots";
CREATE TRIGGER set_updated_at_analytics
  BEFORE UPDATE ON "analytics_daily_snapshots"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- PART 9: BATCH JOB INTEGRITY CONSTRAINTS
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_jobs_processed_not_exceed_total') THEN
    ALTER TABLE "batch_jobs" ADD CONSTRAINT "chk_batch_jobs_processed_not_exceed_total" CHECK ("processed_items" <= "total_items");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_batch_jobs_counts_not_exceed_processed') THEN
    ALTER TABLE "batch_jobs" ADD CONSTRAINT "chk_batch_jobs_counts_not_exceed_processed" CHECK ("success_count" + "failure_count" <= "processed_items");
  END IF;
END $$;

-- =============================================================================
-- PART 10: IMMUTABLE AUDIT LOG PROTECTION
-- =============================================================================

CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_audit_log_update ON "audit_logs";
CREATE TRIGGER prevent_audit_log_update
  BEFORE UPDATE ON "audit_logs"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

DROP TRIGGER IF EXISTS prevent_audit_log_delete ON "audit_logs";
CREATE TRIGGER prevent_audit_log_delete
  BEFORE DELETE ON "audit_logs"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- =============================================================================
-- PART 11: ANALYTICS UNIQUE CONSTRAINT
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "idx_analytics_org_date_paradigm_unique"
  ON "analytics_daily_snapshots" ("org_id", "date", "paradigm_type");
