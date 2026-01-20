/**
 * Type declarations for drizzle-kit
 *
 * drizzle-kit doesn't ship with type declarations.
 * This file provides minimal declarations needed for drizzle.config.ts.
 */

declare module 'drizzle-kit' {
  export interface DrizzleConfig {
    schema: string;
    out: string;
    dialect: 'postgresql' | 'mysql' | 'sqlite';
    dbCredentials: {
      url: string;
    };
  }

  export function defineConfig(config: DrizzleConfig): DrizzleConfig;
}
