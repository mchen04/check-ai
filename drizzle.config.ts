import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// Load .env.local first with override to ensure it takes precedence
config({ path: '.env.local', override: true });
export default defineConfig({
  schema: './utils/db/schema.ts',
  out: './utils/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
