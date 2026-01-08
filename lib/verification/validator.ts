/**
 * Verification Request Validation
 * Zod schemas and validation functions for verification requests
 */

import { z } from 'zod';
import { MethodsConfig } from './types';

// =============================================================================
// SCHEMAS
// =============================================================================

export const MethodsConfigSchema = z
  .object({
    semantic: z.number().min(0).max(1).optional(),
    reasoning: z.number().min(0).max(1).optional(),
    tool: z.number().min(0).max(1).optional(),
    biprm: z.number().min(0).max(1).optional(),
    ensemble: z.number().min(0).max(1).optional(),
    entropy: z.number().min(0).max(1).optional(),
    formal: z.number().min(0).max(1).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined && v > 0), {
    message: 'At least one verification method must be specified with weight > 0',
  });

export const VerifyRequestSchema = z.object({
  content: z.string().min(1).max(100000),
  context: z.record(z.string(), z.unknown()).optional(),
  methods: MethodsConfigSchema,
  idempotencyKey: z.string().max(255).optional(),
});

// =============================================================================
// TYPES
// =============================================================================

export type VerifyRequestInput = z.infer<typeof VerifyRequestSchema>;

export interface ValidatedVerifyRequest {
  content: string;
  context?: Record<string, unknown>;
  methods: MethodsConfig;
  idempotencyKey?: string;
}

export interface ValidationSuccess {
  success: true;
  data: ValidatedVerifyRequest;
}

export interface ValidationFailure {
  success: false;
  errors: Array<{ field: string; message: string }>;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate a verify request
 */
export function validateVerifyRequest(body: unknown): ValidationResult {
  const result = VerifyRequestSchema.safeParse(body);

  if (result.success) {
    return {
      success: true,
      data: result.data as ValidatedVerifyRequest,
    };
  }

  return {
    success: false,
    errors: result.error.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  };
}

/**
 * Get the list of requested methods with weight > 0
 */
export function getRequestedMethods(methods: MethodsConfig): string[] {
  return Object.entries(methods)
    .filter(([, weight]) => weight !== undefined && weight > 0)
    .map(([method]) => method);
}

/**
 * Count the number of methods with weight > 0
 */
export function getMethodsCount(methods: MethodsConfig): number {
  return Object.values(methods).filter((w) => w !== undefined && w > 0).length;
}
