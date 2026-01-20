/**
 * Date Formatting Utilities
 *
 * Centralized date formatting functions for consistent display across the app.
 * These use the native Intl.DateTimeFormat for locale-aware formatting.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface FormatDateOptions {
  /** Fallback text when date is null/undefined */
  fallback?: string;
  /** Whether to include time */
  includeTime?: boolean;
  /** Whether to include seconds in time */
  includeSeconds?: boolean;
}

// =============================================================================
// FORMAT FUNCTIONS
// =============================================================================

/**
 * Format a date for display in tables and cards.
 * Default format: "Jan 15, 2:30 PM"
 *
 * @param dateString - ISO date string or null
 * @param options - Formatting options
 * @returns Formatted date string or fallback
 */
export function formatDate(
  dateString: string | Date | null | undefined,
  options: FormatDateOptions = {}
): string {
  const { fallback = 'Never', includeTime = true, includeSeconds = false } = options;

  if (!dateString) {
    return fallback;
  }

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  if (isNaN(date.getTime())) {
    return fallback;
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };

  if (includeTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
    if (includeSeconds) {
      formatOptions.second = '2-digit';
    }
  }

  return date.toLocaleString(undefined, formatOptions);
}

/**
 * Format a date with full date and time.
 * Default format: "Jan 15, 2026, 2:30:45 PM"
 */
export function formatDateTime(
  dateString: string | Date | null | undefined,
  fallback = '-'
): string {
  return formatDate(dateString, {
    fallback,
    includeTime: true,
    includeSeconds: true,
  });
}

/**
 * Format a date without time.
 * Default format: "Jan 15"
 */
export function formatDateOnly(
  dateString: string | Date | null | undefined,
  fallback = '-'
): string {
  return formatDate(dateString, {
    fallback,
    includeTime: false,
  });
}

/**
 * Format a date for audit logs and detailed views.
 * Uses date-fns format when available, falls back to native.
 * Format: "Jan 15, 2026 at 2:30 PM"
 */
export function formatDateLong(
  dateString: string | Date | null | undefined,
  fallback = '-'
): string {
  if (!dateString) {
    return fallback;
  }

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  if (isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a relative time (e.g., "2 hours ago", "in 3 days").
 * Falls back to absolute date if Intl.RelativeTimeFormat is not available.
 */
export function formatRelativeTime(
  dateString: string | Date | null | undefined,
  fallback = '-'
): string {
  if (!dateString) {
    return fallback;
  }

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  if (isNaN(date.getTime())) {
    return fallback;
  }

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  // Use RelativeTimeFormat if available
  if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

    if (Math.abs(diffSecs) < 60) {
      return rtf.format(diffSecs, 'second');
    }
    if (Math.abs(diffMins) < 60) {
      return rtf.format(diffMins, 'minute');
    }
    if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, 'hour');
    }
    if (Math.abs(diffDays) < 30) {
      return rtf.format(diffDays, 'day');
    }
  }

  // Fall back to absolute date
  return formatDate(date);
}
