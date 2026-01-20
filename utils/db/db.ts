import 'server-only';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Use global singleton to prevent connection pool exhaustion during hot reload
const globalForDb = globalThis as unknown as {
  client: postgres.Sql | undefined;
};

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = globalForDb.client ?? postgres(process.env.DATABASE_URL!, { prepare: false });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });

// Type for database operations that can work with both db and transactions
export type DbOrTx = PostgresJsDatabase<typeof schema>;

/**
 * Execute a callback within a database transaction
 * Automatically rolls back on error
 */
export async function withTransaction<T>(
  callback: (tx: DbOrTx) => Promise<T>
): Promise<T> {
  return db.transaction(callback);
}
