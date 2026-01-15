/**
 * Limits Constants
 * Centralized numeric limits used across the application
 */

// =============================================================================
// PAGINATION DEFAULTS
// =============================================================================

/**
 * Default pagination limits for API endpoints
 */
export const PAGINATION_LIMITS = {
  /** Default page size when not specified */
  defaultLimit: 20,
  /** Maximum allowed page size */
  maxLimit: 100,
} as const;

// =============================================================================
// EXPORT LIMITS
// =============================================================================

/**
 * Export operation limits
 */
export const EXPORT_LIMITS = {
  /** Default export limit */
  defaultLimit: 10000,
  /** Maximum export limit */
  maxLimit: 10000,
} as const;

// =============================================================================
// BATCH LIMITS
// =============================================================================

/**
 * Batch operation limits
 */
export const BATCH_LIMITS = {
  /** Default results per page */
  defaultResultsLimit: 50,
  /** Maximum results per page */
  maxResultsLimit: 100,
  /** Default cleanup limit per run */
  cleanupLimit: 1000,
} as const;

// =============================================================================
// TEXT LIMITS
// =============================================================================

/**
 * Text field limits
 */
export const TEXT_LIMITS = {
  /** Content preview truncation length */
  contentPreviewLength: 200,
  /** Resolution text max length */
  resolutionMaxLength: 2000,
} as const;

// =============================================================================
// TIME LIMITS
// =============================================================================

/**
 * Time-based limits in milliseconds
 */
export const TIME_LIMITS = {
  /** Team invite expiry (7 days) */
  inviteExpiryMs: 7 * 24 * 60 * 60 * 1000,
} as const;
