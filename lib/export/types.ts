/**
 * Export Types
 * Type definitions for data export functionality
 */

import { z } from 'zod';
import { EXPORT_LIMITS } from '@/lib/constants/limits';

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
  limit: z.number().min(1).max(EXPORT_LIMITS.maxLimit).default(EXPORT_LIMITS.defaultLimit),
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
