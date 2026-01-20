/**
 * Utilities Barrel Export
 *
 * Central export for all utility functions.
 * Import utilities from '@/lib/utils' instead of individual files.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// =============================================================================
// CLASS NAME UTILITIES (shadcn/ui)
// =============================================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// =============================================================================
// NUMBER UTILITIES
// =============================================================================

/**
 * Clamp a value to be within a range [min, max]
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Clamp a value to be within [0, 1] (useful for ratios/percentages)
 */
export function clampRatio(value: number): number {
  return clamp(value, 0, 1);
}

// =============================================================================
// DATE FORMATTING UTILITIES
// =============================================================================

export {
  formatDate,
  formatDateTime,
  formatDateOnly,
  formatDateLong,
  formatRelativeTime,
  type FormatDateOptions,
} from './date';

// =============================================================================
// ERROR HANDLING UTILITIES
// =============================================================================

export {
  getErrorMessage,
  isErrorWithName,
} from './error';
