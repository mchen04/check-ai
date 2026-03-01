/**
 * Runtime Environment Validation
 * Checks that required environment variables are set at startup.
 * Import from instrumentation.ts so it runs once on server boot.
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('Env');

interface EnvRule {
  key: string;
  required: boolean;
  validate?: (value: string) => string | null; // returns error message or null
}

const rules: EnvRule[] = [
  { key: 'DATABASE_URL', required: true },
  { key: 'NEXT_PUBLIC_SUPABASE_URL', required: true },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', required: true },
  {
    key: 'ENCRYPTION_KEY',
    required: false,
    validate: (value) => {
      try {
        const decoded = Buffer.from(value, 'base64');
        if (decoded.length !== 32) {
          return `ENCRYPTION_KEY must decode to 32 bytes (got ${decoded.length})`;
        }
        return null;
      } catch {
        return 'ENCRYPTION_KEY is not valid base64';
      }
    },
  },
];

export function validateEnv(): void {
  const errors: string[] = [];

  for (const rule of rules) {
    const value = process.env[rule.key];

    if (!value) {
      if (rule.required) {
        errors.push(`Missing required env var: ${rule.key}`);
      }
      continue;
    }

    if (rule.validate) {
      const err = rule.validate(value);
      if (err) {
        errors.push(err);
      }
    }
  }

  if (errors.length > 0) {
    for (const err of errors) {
      log.error(err);
    }
    throw new Error(
      `Environment validation failed:\n  - ${errors.join('\n  - ')}`
    );
  }

  log.info('Environment validation passed');
}
