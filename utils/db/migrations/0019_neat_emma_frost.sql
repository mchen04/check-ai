ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_provider_credential_id_provider_credentials_id_fk";
--> statement-breakpoint
ALTER TABLE "api_keys" DROP COLUMN "provider_credential_id";--> statement-breakpoint
ALTER TABLE "api_keys" DROP COLUMN "provider";--> statement-breakpoint
ALTER TABLE "api_keys" DROP COLUMN "encrypted_key";