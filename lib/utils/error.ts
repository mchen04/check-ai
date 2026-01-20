/**
 * Error Utilities
 *
 * Centralized error handling utilities for consistent error message extraction.
 */

// =============================================================================
// ERROR MESSAGE EXTRACTION
// =============================================================================

/**
 * Extract error message from unknown error types.
 * Useful in catch blocks where the error type is unknown.
 *
 * @param error - The caught error (unknown type)
 * @param fallback - Fallback message if error message can't be extracted
 * @returns The error message string
 *
 * @example
 * ```ts
 * try {
 *   await someAsyncOperation();
 * } catch (error) {
 *   setError(getErrorMessage(error));
 * }
 * ```
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'An unexpected error occurred'
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}

/**
 * Check if an error is an instance of a specific error type by name.
 * Useful when the error class might not be available for instanceof checks.
 *
 * @param error - The error to check
 * @param name - The error name to match
 * @returns True if the error has the matching name
 */
export function isErrorWithName(error: unknown, name: string): boolean {
  return error instanceof Error && error.name === name;
}
