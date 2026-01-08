/**
 * Export Types
 * Type definitions for data export functionality
 */

// =============================================================================
// Request Types
// =============================================================================

export interface ExportRequest {
  format: 'csv' | 'json';
  startDate?: string;
  endDate?: string;
  includeParadigmResults?: boolean;
  limit?: number;
}

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
