/**
 * Batch Constants
 * Centralized batch job status types
 */

// =============================================================================
// BATCH JOB STATUSES
// =============================================================================

/**
 * Valid batch job statuses
 */
export const BATCH_JOB_STATUSES = [
  'pending',
  'validating',
  'processing',
  'completed',
  'failed',
  'cancelled',
] as const;

export type BatchJobStatus = (typeof BATCH_JOB_STATUSES)[number];
