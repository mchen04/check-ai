CREATE TABLE IF NOT EXISTS "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"source" text DEFAULT 'landing' NOT NULL,
	"referrer" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "verification_retention_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "batch_retention_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "data_retention_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "has_created_api_key" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "has_run_verification" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "has_visited_playground" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "verifications" ADD COLUMN "expires_at" timestamp;