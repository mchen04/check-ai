/**
 * Export Types
 * Type definitions for data export functionality
 */

import { z } from 'zod';

// =============================================================================
// Request Types
// =============================================================================

/**
 * Zod schema for export request validation
 */
export const ExportRequestSchema = z.object({
  format: z.enum(['csv', 'json']),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeParadigmResults: z.boolean().default(false),
  limit: z.number().min(1).max(10000).default(10000),
});

export type ExportRequest = z.infer<typeof ExportRequestSchema>;

// =============================================================================
// Export Data Types
// =============================================================================

export interface VerificationExport {
  id: string;
  content: string;
  verdict: string | null;
  confidence: number | null;
  decision: string | null;
  status: string;
  processingTimeMs: number | null;
  costCents: number | null;
  createdAt: string;
  completedAt: string | null;
  paradigmResults?: ParadigmResultExport[];
}

export interface ParadigmResultExport {
  paradigm: string;
  verdict: string | null;
  confidence: number | null;
  reasoning: string | null;
}

// =============================================================================
// Constants
// =============================================================================

export const MAX_EXPORT_LIMIT = 10000;

// =============================================================================
// CSV Headers
// =============================================================================

export const BASE_CSV_HEADERS = [
  'id',
  'content',
  'verdict',
  'confidence',
  'decision',
  'status',
  'processing_time_ms',
  'cost_cents',
  'created_at',
  'completed_at',
] as const;

export type CsvHeader = (typeof BASE_CSV_HEADERS)[number] | 'paradigm_results';
