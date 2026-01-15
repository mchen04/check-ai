/**
 * APM Query Monitoring
 *
 * Lightweight query performance monitoring for database operations.
 * Tracks slow queries and provides metrics for optimization.
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('APM');

// Configuration
const SLOW_QUERY_THRESHOLD_MS = 100; // Log queries slower than this
const VERY_SLOW_QUERY_THRESHOLD_MS = 500; // Warn about queries slower than this

interface QueryMetrics {
  operation: string;
  table?: string;
  durationMs: number;
  timestamp: Date;
  success: boolean;
  rowCount?: number;
  error?: string;
}

// In-memory metrics buffer (for development/debugging)
// In production, you'd send these to DataDog, NewRelic, or similar
const metricsBuffer: QueryMetrics[] = [];
const MAX_BUFFER_SIZE = 1000;

/**
 * Track a database query's performance (internal use)
 */
function trackQuery(metrics: QueryMetrics): void {
  // Add to buffer
  metricsBuffer.push(metrics);
  if (metricsBuffer.length > MAX_BUFFER_SIZE) {
    metricsBuffer.shift();
  }

  // Log slow queries
  if (metrics.durationMs >= VERY_SLOW_QUERY_THRESHOLD_MS) {
    log.warn(
      {
        operation: metrics.operation,
        table: metrics.table,
        durationMs: metrics.durationMs,
        rowCount: metrics.rowCount,
      },
      `Very slow query: ${metrics.operation} on ${metrics.table || 'unknown'}`
    );
  } else if (metrics.durationMs >= SLOW_QUERY_THRESHOLD_MS) {
    log.info(
      {
        operation: metrics.operation,
        table: metrics.table,
        durationMs: metrics.durationMs,
        rowCount: metrics.rowCount,
      },
      `Slow query: ${metrics.operation} on ${metrics.table || 'unknown'}`
    );
  }

  // Log errors
  if (!metrics.success && metrics.error) {
    log.error(
      {
        operation: metrics.operation,
        table: metrics.table,
        error: metrics.error,
        durationMs: metrics.durationMs,
      },
      'Query failed'
    );
  }
}

/**
 * Wrap an async database operation with timing
 */
export async function withQueryTiming<T>(
  operation: string,
  table: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  let success = true;
  let error: string | undefined;
  let result: T;

  try {
    result = await fn();
    return result;
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : 'Unknown error';
    throw err;
  } finally {
    const durationMs = Math.round(performance.now() - startTime);
    trackQuery({
      operation,
      table,
      durationMs,
      timestamp: new Date(),
      success,
      error,
    });
  }
}

