/**
 * API Response Formatters
 * Utility functions for consistent formatting of API responses
 *
 * These utilities eliminate duplication of common formatting patterns
 * across API routes such as date conversion and numeric parsing.
 */

// =============================================================================
// DATE FORMATTING
// =============================================================================

/**
 * Convert a Date object to ISO string, with null handling
 *
 * @param date - Date object or null/undefined
 * @returns ISO string or null
 *
 * @example
 * formatDateToISO(new Date()) // "2024-01-15T10:30:00.000Z"
 * formatDateToISO(null) // null
 * formatDateToISO(undefined) // null
 */
export function formatDateToISO(date: Date | null | undefined): string | null {
  return date?.toISOString() ?? null;
}

/**
 * Convert a Date object to ISO string, throwing if null
 * Use when the date is required
 *
 * @param date - Date object (required)
 * @returns ISO string
 *
 * @example
 * formatRequiredDateToISO(new Date()) // "2024-01-15T10:30:00.000Z"
 */
export function formatRequiredDateToISO(date: Date): string {
  return date.toISOString();
}

/**
 * Format a date for use in filenames (YYYY-MM-DD)
 *
 * @param date - Date object (defaults to now)
 * @returns Date string suitable for filenames
 *
 * @example
 * formatDateForFilename() // "2024-01-15"
 * formatDateForFilename(new Date('2024-03-20')) // "2024-03-20"
 */
export function formatDateForFilename(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Check if a date is expired (in the past)
 *
 * @param date - Date to check, or null/undefined
 * @returns true if date is in the past, false otherwise
 *
 * @example
 * isDateExpired(new Date('2020-01-01')) // true
 * isDateExpired(new Date('2030-01-01')) // false
 * isDateExpired(null) // false
 */
export function isDateExpired(date: Date | null | undefined): boolean {
  return date != null && date < new Date();
}

// =============================================================================
// NUMERIC PARSING
// =============================================================================

/**
 * Parse a decimal string to number, with null handling
 * Commonly used for confidence scores stored as decimal(5,4) in PostgreSQL
 *
 * @param value - String representation of a decimal or null
 * @returns Parsed number or null
 *
 * @example
 * parseDecimal("0.9500") // 0.95
 * parseDecimal(null) // null
 * parseDecimal("") // null
 */
export function parseDecimal(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse a decimal string to number with a default value
 *
 * @param value - String representation of a decimal or null
 * @param defaultValue - Value to return if parsing fails
 * @returns Parsed number or default
 *
 * @example
 * parseDecimalWithDefault("0.9500", 0.5) // 0.95
 * parseDecimalWithDefault(null, 0.5) // 0.5
 */
export function parseDecimalWithDefault(
  value: string | null | undefined,
  defaultValue: number
): number {
  return parseDecimal(value) ?? defaultValue;
}

/**
 * Parse an integer from string with null handling
 *
 * @param value - String representation or null
 * @returns Parsed integer or null
 */
export function parseInteger(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

// =============================================================================
// STRING UTILITIES
// =============================================================================

/**
 * Truncate a string to a maximum length
 * Useful for preview/summary fields in list views
 *
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @param ellipsis - Whether to add "..." suffix (default: false)
 * @returns Truncated string
 *
 * @example
 * truncateString("Hello World", 5) // "Hello"
 * truncateString("Hello World", 5, true) // "Hello..."
 */
export function truncateString(
  str: string | null | undefined,
  maxLength: number,
  ellipsis = false
): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  const truncated = str.slice(0, maxLength);
  return ellipsis ? `${truncated}...` : truncated;
}

// =============================================================================
// NULL COALESCING HELPERS
// =============================================================================

/**
 * Coalesce null/undefined to null (not undefined)
 * Useful for JSON serialization where undefined is omitted but null is preserved
 *
 * @param value - Any value
 * @returns Value or null
 */
export function nullCoalesce<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

// =============================================================================
// COMMON FIELD FORMATTERS
// =============================================================================

/**
 * Format common verification fields for API response
 */
export interface FormattedVerificationFields {
  id: string;
  content: string;
  status: string;
  verdict: string | null;
  confidence: number | null;
  processingTimeMs: number | null;
  costCents: number | null;
  createdAt: string;
  completedAt: string | null;
}

/**
 * Format verification record for API response
 * Standardizes the common transformation pattern used in verification endpoints
 */
export function formatVerificationForResponse(record: {
  id: string;
  content: string;
  status: string;
  verdict: string | null;
  confidence: string | null;
  processingTimeMs: number | null;
  costCents: number | null;
  createdAt: Date;
  completedAt: Date | null;
}): FormattedVerificationFields {
  return {
    id: record.id,
    content: record.content,
    status: record.status,
    verdict: record.verdict,
    confidence: parseDecimal(record.confidence),
    processingTimeMs: record.processingTimeMs,
    costCents: nullCoalesce(record.costCents),
    createdAt: formatRequiredDateToISO(record.createdAt),
    completedAt: formatDateToISO(record.completedAt),
  };
}

// =============================================================================
// PARADIGM RESULT FORMATTERS
// =============================================================================

/**
 * Format common paradigm result fields for API response
 */
export interface FormattedParadigmResultFields {
  paradigm: string;
  provider: string | null;
  model: string | null;
  verdict: string | null;
  confidence: number | null;
  reasoning: string | null;
  processingTimeMs: number | null;
  error: string | null;
  createdAt: string | Date;
}

/**
 * Extended paradigm result fields including id and weight
 * Note: createdAt is omitted in extended version as it's typically not needed in dashboard views
 */
export interface FormattedParadigmResultFieldsExtended {
  id: string;
  paradigm: string;
  weight: number | null;
  provider: string | null;
  model: string | null;
  verdict: string | null;
  confidence: number | null;
  reasoning: string | null;
  processingTimeMs: number | null;
  error: string | null;
}

/**
 * Format paradigm result record for API response
 * Standardizes the common transformation pattern used in verification endpoints
 */
export function formatParadigmResultForResponse(record: {
  paradigmType: string;
  provider: string | null;
  model: string | null;
  verdict: string | null;
  confidence: string | null;
  reasoning: string | null;
  processingTimeMs: number | null;
  errorMessage: string | null;
  createdAt: Date;
}): FormattedParadigmResultFields {
  return {
    paradigm: record.paradigmType,
    provider: record.provider,
    model: record.model,
    verdict: record.verdict,
    confidence: parseDecimal(record.confidence),
    reasoning: record.reasoning,
    processingTimeMs: record.processingTimeMs,
    error: record.errorMessage,
    createdAt: record.createdAt,
  };
}

/**
 * Format paradigm result record with extended fields (id, weight)
 * Used in dashboard endpoints that need additional details
 */
export function formatParadigmResultExtendedForResponse(record: {
  id: string;
  paradigmType: string;
  weight: string | null;
  provider: string | null;
  model: string | null;
  verdict: string | null;
  confidence: string | null;
  reasoning: string | null;
  processingTimeMs: number | null;
  errorMessage: string | null;
}): FormattedParadigmResultFieldsExtended {
  return {
    id: record.id,
    paradigm: record.paradigmType,
    weight: parseDecimal(record.weight),
    provider: record.provider,
    model: record.model,
    verdict: record.verdict,
    confidence: parseDecimal(record.confidence),
    reasoning: record.reasoning,
    processingTimeMs: record.processingTimeMs,
    error: record.errorMessage,
  };
}

// =============================================================================
// WEBHOOK FORMATTERS
// =============================================================================

/**
 * Format webhook list item for API response
 */
export interface FormattedWebhookListItem {
  id: string;
  url: string;
  events: string[];
  description: string | null;
  isActive: boolean;
  lastTriggeredAt: string | null;
  lastStatus: number | null;
  failureCount: number;
  createdAt: string;
}

/**
 * Format webhook record for list API response
 */
export function formatWebhookForResponse(record: {
  id: string;
  url: string;
  events: string[];
  description: string | null;
  isActive: boolean;
  lastTriggeredAt: Date | null;
  lastStatus: number | null;
  failureCount: number;
  createdAt: Date;
}): FormattedWebhookListItem {
  return {
    id: record.id,
    url: record.url,
    events: record.events,
    description: record.description,
    isActive: record.isActive,
    lastTriggeredAt: formatDateToISO(record.lastTriggeredAt),
    lastStatus: record.lastStatus,
    failureCount: record.failureCount,
    createdAt: formatRequiredDateToISO(record.createdAt),
  };
}

/**
 * Format webhook delivery for API response
 */
export interface FormattedWebhookDelivery {
  id: string;
  event: string;
  status: string;
  attemptNumber: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  responseStatus: number | null;
  responseBody: string | null;
  lastError: string | null;
  durationMs: number | null;
  createdAt: string;
  deliveredAt: string | null;
  failedAt: string | null;
  attemptHistory: unknown;
}

/**
 * Format webhook delivery record for API response
 */
export function formatWebhookDeliveryForResponse(record: {
  id: string;
  event: string;
  status: string;
  attemptNumber: number;
  maxAttempts: number;
  nextRetryAt: Date | null;
  responseStatus: number | null;
  responseBody: string | null;
  lastError: string | null;
  durationMs: number | null;
  createdAt: Date;
  deliveredAt: Date | null;
  failedAt: Date | null;
  attemptHistory: unknown;
}): FormattedWebhookDelivery {
  return {
    id: record.id,
    event: record.event,
    status: record.status,
    attemptNumber: record.attemptNumber,
    maxAttempts: record.maxAttempts,
    nextRetryAt: formatDateToISO(record.nextRetryAt),
    responseStatus: record.responseStatus,
    responseBody: record.responseBody,
    lastError: record.lastError,
    durationMs: record.durationMs,
    createdAt: formatRequiredDateToISO(record.createdAt),
    deliveredAt: formatDateToISO(record.deliveredAt),
    failedAt: formatDateToISO(record.failedAt),
    attemptHistory: record.attemptHistory,
  };
}
