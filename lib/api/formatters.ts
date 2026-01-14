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
