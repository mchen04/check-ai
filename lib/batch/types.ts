/**
 * Batch Processing Types
 * Type definitions for batch verification jobs
 */

import { z } from 'zod';
import { methodsConfigSchema, MethodsConfig, VerifyOptions, VerifyOptionsSchema } from '@/lib/verification';
import { MethodOverridesSchema, type MethodOverrides } from '@/lib/verification/validator';
import type { BatchStatus, BatchItemStatus } from '@/utils/db/schema';

// Re-export MethodsConfig for consumers of this module
export type { MethodsConfig };

// =============================================================================
// Batch Job Types
// =============================================================================

export interface BatchJob {
  id: string;
  orgId: string;
  name: string | null;
  inputFormat: 'json' | 'csv';
  originalFileName: string | null;
  methodsConfig: MethodsConfig;
  methodOverrides: MethodOverrides | null;
  verifyOptions: VerifyOptions | null;
  context: Record<string, unknown> | null;
  status: BatchStatus;
  totalItems: number;
  processedItems: number;
  successCount: number;
  failureCount: number;
  triggerTaskIds: string[] | null; // Trigger.dev task IDs
  errorMessage: string | null;
  validationErrors: BatchValidationError[] | null;
  totalCostCents: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  expiresAt: Date | null;
}

export interface BatchItem {
  id: string;
  batchId: string;
  itemIndex: number;
  idempotencyKey: string | null;
  content: string;
  itemContext: Record<string, unknown> | null;
  status: BatchItemStatus;
  verificationId: string | null;
  verdict: string | null;
  confidence: number | null;
  decision: string | null;
  errorMessage: string | null;
  retryCount: number;
  costCents: number | null;
  processingTimeMs: number | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface BatchValidationError {
  row: number;
  error: string;
}

// Note: MethodsConfig is imported from @/lib/verification/types

// =============================================================================
// Request/Response Types
// =============================================================================

/**
 * Individual batch item input
 */
export interface BatchItemInput {
  content: string;
  context?: Record<string, unknown>;
  idempotencyKey?: string;
}

/**
 * Batch creation request body
 */
export const createBatchSchema = z.object({
  name: z.string().max(255).optional(),
  items: z
    .array(
      z.object({
        content: z.string().min(1).max(50000),
        context: z.record(z.string(), z.unknown()).optional(),
        idempotencyKey: z.string().max(255).optional(),
      })
    )
    .min(1)
    .max(100)
    .optional(),
  fileId: z.uuid().optional(),
  methods: methodsConfigSchema,
  options: VerifyOptionsSchema,
  methodOverrides: MethodOverridesSchema,
  apiKeyId: z.string().uuid().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type CreateBatchRequest = z.infer<typeof createBatchSchema>;

/**
 * Batch job response
 */
export interface BatchJobResponse {
  id: string;
  name: string | null;
  status: BatchStatus;
  inputFormat: string;
  originalFileName: string | null;
  methodsConfig: MethodsConfig;
  verifyOptions: VerifyOptions | null;
  context: Record<string, unknown> | null;
  totalItems: number;
  processedItems: number;
  successCount: number;
  failureCount: number;
  progress: number;
  errorMessage: string | null;
  validationErrors: BatchValidationError[] | null;
  totalCostCents: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

/**
 * Batch item result response
 */
export interface BatchItemResponse {
  id: string;
  itemIndex: number;
  idempotencyKey: string | null;
  content: string;
  context: Record<string, unknown> | null;
  status: BatchItemStatus;
  verificationId: string | null;
  verdict: string | null;
  confidence: number | null;
  decision: string | null;
  errorMessage: string | null;
  costCents: number | null;
  processingTimeMs: number | null;
  completedAt: string | null;
}

/**
 * Batch results response
 */
export interface BatchResultsResponse {
  batchId: string;
  status: BatchStatus;
  summary: {
    totalItems: number;
    processedItems: number;
    successCount: number;
    failureCount: number;
    totalCostCents: number;
  };
  items: BatchItemResponse[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// =============================================================================
// Task Queue Types (Trigger.dev)
// =============================================================================

/**
 * Payload sent to Trigger.dev for batch item processing
 */
export interface BatchItemQueuePayload {
  batchId: string;
  itemId: string;
  itemIndex: number;
  orgId: string;
  content: string;
  context: Record<string, unknown> | null;
  methodsConfig: MethodsConfig;
  methodOverrides?: MethodOverrides;
}

/**
 * Result from processing a batch item
 */
export interface BatchItemProcessResult {
  itemId: string;
  success: boolean;
  verificationId?: string;
  verdict?: string;
  confidence?: number;
  decision?: string;
  costCents?: number;
  processingTimeMs?: number;
  error?: string;
}

// =============================================================================
// File Upload Types
// =============================================================================

export interface FileUploadResult {
  fileId: string;
  originalFileName: string;
  format: 'json' | 'csv';
  itemCount: number;
  validationErrors: BatchValidationError[];
  expiresAt: string;
}

export interface ParsedBatchItem {
  content: string;
  context?: Record<string, unknown>;
  idempotencyKey?: string;
  rowNumber: number;
}

export interface ParseResult {
  items: ParsedBatchItem[];
  errors: BatchValidationError[];
}

// =============================================================================
// Realtime Event Types
// =============================================================================

export type BatchRealtimeEvent =
  | { type: 'status_update'; status: BatchStatus; errorMessage?: string }
  | {
      type: 'item_complete';
      itemId: string;
      itemIndex: number;
      success: boolean;
      verdict?: string;
      confidence?: number;
      processedItems: number;
      successCount: number;
      failureCount: number;
    }
  | {
      type: 'complete';
      status: BatchStatus;
      totalItems: number;
      successCount: number;
      failureCount: number;
      totalCostCents: number;
    };

// =============================================================================
// Constants
// =============================================================================

export const BATCH_CONSTANTS = {
  MAX_ITEMS: 100,
  MAX_FILE_SIZE_MB: 10,
  MAX_CONTENT_LENGTH: 50000,
  FILE_EXPIRY_HOURS: 1,
  RESULTS_EXPIRY_DAYS: 30,
  MAX_RETRIES: 3,
} as const;
