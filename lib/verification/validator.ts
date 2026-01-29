/**
 * Verification Request Validation
 * Zod schemas and validation functions for verification requests
 */

import { z } from 'zod';
import { MethodsConfig, VerifyOptions } from './types';

// =============================================================================
// SCHEMAS
// =============================================================================

// Methods can be specified per-request or default from API key config
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
  .optional(); // Optional - can come from API key's paradigm config

export const VerifyOptionsSchema = z
  .object({
    timeout: z.number().min(1000).max(300000).optional(),
    minConfidence: z.number().min(0).max(1).optional(),
    acceptThreshold: z.number().min(0).max(1).optional(),
    escalateThreshold: z.number().min(0).max(1).optional(),
    maxRetries: z.number().int().min(0).max(5).optional(),
    retryOnLowConfidence: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // If both thresholds provided, accept must be > escalate
      if (data.acceptThreshold !== undefined && data.escalateThreshold !== undefined) {
        return data.acceptThreshold > data.escalateThreshold;
      }
      return true;
    },
    { message: 'acceptThreshold must be greater than escalateThreshold' }
  )
  .refine(
    (data) => {
      // retryOnLowConfidence requires minConfidence
      if (data.retryOnLowConfidence && data.minConfidence === undefined) {
        return false;
      }
      return true;
    },
    { message: 'retryOnLowConfidence requires minConfidence to be specified' }
  )
  .optional();

// Context value schema - restrict to safe primitive types
const ContextValueSchema = z.union([
  z.string().max(10000),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const VerifyRequestSchema = z.object({
  content: z.string().min(1).max(50000), // Reduced from 100KB to 50KB for DoS protection
  context: z.record(z.string().max(100), ContextValueSchema).optional(),
  methods: MethodsConfigSchema,
  options: VerifyOptionsSchema,
  idempotencyKey: z.string().max(255).optional(),
});

// =============================================================================
// TYPES
// =============================================================================

export type VerifyRequestInput = z.infer<typeof VerifyRequestSchema>;

export interface ValidatedVerifyRequest {
  content: string;
  context?: Record<string, unknown>;
  methods?: MethodsConfig; // Optional - can come from API key's paradigm config
  options?: VerifyOptions;
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
  let count = 0;
  for (const w of Object.values(methods)) {
    if (w !== undefined && w > 0) count++;
  }
  return count;
}
