CREATE TABLE IF NOT EXISTS "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"source" text DEFAULT 'landing' NOT NULL,
	"referrer" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'verification_retention_days') THEN
    ALTER TABLE "organizations" ADD COLUMN "verification_retention_days" integer DEFAULT 30 NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'batch_retention_days') THEN
    ALTER TABLE "organizations" ADD COLUMN "batch_retention_days" integer DEFAULT 30 NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'data_retention_enabled') THEN
    ALTER TABLE "organizations" ADD COLUMN "data_retention_enabled" boolean DEFAULT true NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE "user_preferences" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'has_created_api_key') THEN
    ALTER TABLE "user_preferences" ADD COLUMN "has_created_api_key" boolean DEFAULT false NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'has_run_verification') THEN
    ALTER TABLE "user_preferences" ADD COLUMN "has_run_verification" boolean DEFAULT false NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'has_visited_playground') THEN
    ALTER TABLE "user_preferences" ADD COLUMN "has_visited_playground" boolean DEFAULT false NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verifications' AND column_name = 'expires_at') THEN
    ALTER TABLE "verifications" ADD COLUMN "expires_at" timestamp;
  END IF;
END $$;
