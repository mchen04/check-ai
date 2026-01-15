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
// VALIDATION FUNCTIONS (THROW PATTERN - for routes with middleware)
// =============================================================================

/**
 * Parse JSON body from request, throwing ValidationError on failure
 * Use this for routes wrapped with middleware that handles errors (withApiMiddleware)
 *
 * @param req - Request object
 * @returns Parsed JSON body
 * @throws ValidationError if JSON parsing fails
 *
 * @example
 * const body = await parseJsonBodyOrThrow(req);
 * const validated = MySchema.parse(body);
 */
export async function parseJsonBodyOrThrow(req: Request): Promise<unknown> {
  const { ValidationError } = await import('./errors');
  try {
    return await req.json();
  } catch {
    throw new ValidationError('Invalid JSON in request body');
  }
}

/**
 * Parse JSON body and validate against a Zod schema, throwing on errors
 * Use this for routes wrapped with middleware that handles errors (withApiMiddleware)
 *
 * @param req - Request object
 * @param schema - Zod schema to validate against
 * @returns Validated data
 * @throws ValidationError if JSON parsing or validation fails
 *
 * @example
 * const data = await parseAndValidateOrThrow(req, MySchema);
 */
export async function parseAndValidateOrThrow<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<T> {
  const { ValidationError } = await import('./errors');
  const body = await parseJsonBodyOrThrow(req);

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid request body', {
      errors: result.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  return result.data;
}

// =============================================================================
// VALIDATION FUNCTIONS (RETURN PATTERN - for routes without middleware)
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

  methodNotAllowed: (message = 'Method not allowed') =>
    NextResponse.json({ error: message }, { status: 405 }),

  conflict: (message = 'Conflict') =>
    NextResponse.json({ error: message }, { status: 409 }),

  gone: (message = 'Resource no longer available') =>
    NextResponse.json({ error: message }, { status: 410 }),

  tooManyRequests: (
    message = 'Too many requests',
    options?: { retryAfter?: number; limit?: number; remaining?: number }
  ) => {
    const response = NextResponse.json({ error: message }, { status: 429 });
    if (options?.retryAfter) {
      response.headers.set('Retry-After', options.retryAfter.toString());
    }
    if (options?.limit !== undefined) {
      response.headers.set('X-RateLimit-Limit', options.limit.toString());
    }
    if (options?.remaining !== undefined) {
      response.headers.set('X-RateLimit-Remaining', options.remaining.toString());
    }
    return response;
  },

  internalError: (message = 'Internal server error') =>
    NextResponse.json({ error: message }, { status: 500 }),
} as const;

/**
 * Standard success response factories for common patterns
 *
 * @example
 * // Simple success
 * return successResponse.ok();
 *
 * // Success with data
 * return successResponse.ok({ id: 'abc', name: 'test' });
 *
 * // Created with data
 * return successResponse.created({ id: 'new-id' });
 */
export const successResponse = {
  /** 200 OK with optional data merged into { success: true, ...data } */
  ok: <T extends Record<string, unknown>>(data?: T) =>
    NextResponse.json({ success: true, ...data }),

  /** 201 Created with optional data merged into { success: true, ...data } */
  created: <T extends Record<string, unknown>>(data?: T) =>
    NextResponse.json({ success: true, ...data }, { status: 201 }),

  /** 202 Accepted with optional data merged into { success: true, ...data } */
  accepted: <T extends Record<string, unknown>>(data?: T) =>
    NextResponse.json({ success: true, ...data }, { status: 202 }),

  /** 204 No Content (returns empty response) */
  noContent: () => new NextResponse(null, { status: 204 }),
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

// =============================================================================
// ROUTE PARAMETER HELPERS
// =============================================================================

/**
 * Route context type for Next.js App Router dynamic routes
 * Uses Record<string, string> for compatibility with middleware
 */
export type RouteContext<T extends Record<string, string> = Record<string, string>> = {
  params: Promise<T>;
};

/**
 * Extract a required route parameter from the route context
 * Throws NotFoundError if the parameter is missing
 *
 * @param context - Route context from Next.js handler
 * @param paramName - Name of the parameter to extract (defaults to 'id')
 * @returns The extracted parameter value
 * @throws NotFoundError if parameter is missing
 *
 * @example
 * // Basic usage - extract 'id' parameter
 * const id = await extractRouteParam(routeContext);
 *
 * @example
 * // Extract named parameter
 * const slug = await extractRouteParam<{ slug: string }>(routeContext, 'slug');
 */
export async function extractRouteParam<T extends Record<string, string> = { id: string }>(
  context: RouteContext<T> | undefined,
  paramName: keyof T = 'id' as keyof T
): Promise<string> {
  const { NotFoundError } = await import('./errors');

  if (!context) {
    throw new NotFoundError('Resource');
  }

  const params = await context.params;
  const value = params[paramName];

  if (!value || typeof value !== 'string') {
    throw new NotFoundError('Resource');
  }

  return value;
}

/**
 * Assert that a resource belongs to the given organization
 * Throws AuthorizationError if ownership check fails
 *
 * @param resourceOrgId - The organization ID of the resource
 * @param contextOrgId - The organization ID from the request context
 * @throws AuthorizationError if the resource doesn't belong to the organization
 *
 * @example
 * assertOrgOwnership(verification.orgId, context.orgId);
 */
export async function assertOrgOwnership(
  resourceOrgId: string,
  contextOrgId: string
): Promise<void> {
  if (resourceOrgId !== contextOrgId) {
    const { AuthorizationError } = await import('./errors');
    throw new AuthorizationError();
  }
}
