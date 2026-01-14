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
 * Track a database query's performance
 */
export function trackQuery(metrics: QueryMetrics): void {
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

/**
 * Get recent slow queries (for debugging dashboard)
 */
export function getSlowQueries(thresholdMs: number = SLOW_QUERY_THRESHOLD_MS): QueryMetrics[] {
  return metricsBuffer.filter((m) => m.durationMs >= thresholdMs);
}

/**
 * Get query statistics summary
 */
export function getQueryStats(): {
  totalQueries: number;
  slowQueries: number;
  verySlowQueries: number;
  failedQueries: number;
  averageDurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
} {
  if (metricsBuffer.length === 0) {
    return {
      totalQueries: 0,
      slowQueries: 0,
      verySlowQueries: 0,
      failedQueries: 0,
      averageDurationMs: 0,
      p95DurationMs: 0,
      p99DurationMs: 0,
    };
  }

  const durations = metricsBuffer.map((m) => m.durationMs).sort((a, b) => a - b);
  const totalQueries = metricsBuffer.length;
  const slowQueries = metricsBuffer.filter((m) => m.durationMs >= SLOW_QUERY_THRESHOLD_MS).length;
  const verySlowQueries = metricsBuffer.filter(
    (m) => m.durationMs >= VERY_SLOW_QUERY_THRESHOLD_MS
  ).length;
  const failedQueries = metricsBuffer.filter((m) => !m.success).length;
  const averageDurationMs = Math.round(durations.reduce((a, b) => a + b, 0) / totalQueries);
  const p95Index = Math.floor(totalQueries * 0.95);
  const p99Index = Math.floor(totalQueries * 0.99);

  return {
    totalQueries,
    slowQueries,
    verySlowQueries,
    failedQueries,
    averageDurationMs,
    p95DurationMs: durations[p95Index] || 0,
    p99DurationMs: durations[p99Index] || 0,
  };
}

/**
 * Clear metrics buffer (for testing)
 */
export function clearMetrics(): void {
  metricsBuffer.length = 0;
}

/**
 * Request timing middleware helper
 */
export function createRequestTimer(): {
  start: () => void;
  end: (operation: string) => number;
} {
  let startTime: number;

  return {
    start: () => {
      startTime = performance.now();
    },
    end: (operation: string) => {
      const durationMs = Math.round(performance.now() - startTime);
      if (durationMs >= SLOW_QUERY_THRESHOLD_MS) {
        log.info({ operation, durationMs }, `Request completed: ${operation}`);
      }
      return durationMs;
    },
  };
}
