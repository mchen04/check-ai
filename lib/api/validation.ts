/**
 * API Validation Helpers
 * Utilities for request body validation and error response handling
 *
 * These utilities eliminate duplication of the common Zod validation
 * + error response pattern across API routes.
 */

import { NextResponse } from 'next/server';
import { z, ZodSchema, ZodError } from 'zod';

// =============================================================================
// VALIDATION RESULT TYPE
// =============================================================================

/**
 * Result of parsing and validating a request body
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: NextResponse };

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Parse JSON body and validate against a Zod schema
 * Returns either the validated data or a formatted error response
 *
 * @param req - NextRequest or Request object
 * @param schema - Zod schema to validate against
 * @returns ValidationResult with either data or error response
 *
 * @example
 * const result = await parseAndValidate(req, MySchema);
 * if (!result.success) return result.error;
 * const { data } = result;
 */
export async function parseAndValidate<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      ),
    };
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      success: false,
      error: createValidationErrorResponse(parsed.error),
    };
  }

  return { success: true, data: parsed.data };
}

/**
 * Validate data against a Zod schema (without JSON parsing)
 * Useful when you already have the data
 *
 * @param data - Data to validate
 * @param schema - Zod schema to validate against
 * @returns ValidationResult with either data or error response
 */
export function validate<T>(
  data: unknown,
  schema: ZodSchema<T>
): ValidationResult<T> {
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      error: createValidationErrorResponse(parsed.error),
    };
  }

  return { success: true, data: parsed.data };
}

// =============================================================================
// ERROR RESPONSE HELPERS
// =============================================================================

/**
 * Create a validation error response from a ZodError
 */
export function createValidationErrorResponse(error: ZodError): NextResponse {
  return NextResponse.json(
    {
      error: 'Validation failed',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    },
    { status: 400 }
  );
}

/**
 * Standard error response factories for common HTTP status codes
 */
export const errorResponse = {
  badRequest: (message = 'Bad request') =>
    NextResponse.json({ error: message }, { status: 400 }),

  unauthorized: (message = 'Unauthorized') =>
    NextResponse.json({ error: message }, { status: 401 }),

  forbidden: (message = 'Forbidden') =>
    NextResponse.json({ error: message }, { status: 403 }),

  notFound: (message = 'Not found') =>
    NextResponse.json({ error: message }, { status: 404 }),

  conflict: (message = 'Conflict') =>
    NextResponse.json({ error: message }, { status: 409 }),

  internalError: (message = 'Internal server error') =>
    NextResponse.json({ error: message }, { status: 500 }),
} as const;

// =============================================================================
// QUERY PARAM VALIDATION
// =============================================================================

/**
 * Validate and parse a query parameter as an enum value
 *
 * @param value - Raw query parameter value
 * @param validValues - Array of valid enum values
 * @returns Validated value or null if invalid
 *
 * @example
 * const status = validateEnumParam(searchParams.get('status'), ['pending', 'completed']);
 */
export function validateEnumParam<T extends string>(
  value: string | null,
  validValues: readonly T[]
): T | null {
  if (!value) return null;
  return validValues.includes(value as T) ? (value as T) : null;
}

/**
 * Create a type guard for enum validation
 *
 * @param validValues - Array of valid enum values
 * @returns Type guard function
 *
 * @example
 * const isValidStatus = createEnumGuard(['pending', 'completed'] as const);
 * if (isValidStatus(status)) {
 *   // status is typed as 'pending' | 'completed'
 * }
 */
export function createEnumGuard<T extends string>(
  validValues: readonly T[]
): (value: string) => value is T {
  return (value: string): value is T => validValues.includes(value as T);
}
