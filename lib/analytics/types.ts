import { subDays } from 'date-fns/subDays';

export type TimeRange = '7d' | '30d' | '90d';

// =============================================================================
// SHARED CONSTANTS
// =============================================================================

/**
 * Display names for verification paradigms
 * Used across analytics queries for consistent display
 */
export const PARADIGM_DISPLAY_NAMES: Record<string, string> = {
  semantic: 'Semantic',
  reasoning: 'Reasoning',
  tool: 'Tool',
  biprm: 'BiPRM',
  ensemble: 'Ensemble',
  entropy: 'Entropy',
  formal: 'Formal',
};

// =============================================================================
// SHARED HELPERS
// =============================================================================

/**
 * Calculate start date from time range
 */
export function getDateRangeStart(range: TimeRange): Date {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return subDays(new Date(), days);
}

export interface TrendDataPoint {
  date: string;
  total: number;
  completed: number;
  failed: number;
  escalated: number;
}

export interface VerdictData {
  verdict: 'true' | 'false' | 'uncertain';
  count: number;
  percentage: number;
}

export interface ParadigmData {
  paradigmType: string;
  displayName: string;
  avgConfidence: number;
  avgProcessingTime: number;
  totalCost: number;
  count: number;
  successRate: number;
}

export interface ProviderCost {
  provider: string;
  totalCost: number;
  totalTokens: number;
  percentage: number;
}

export interface ProcessingTimeData {
  date: string;
  avgProcessingTime: number;
  p50: number;
  p95: number;
}

export interface AnalyticsSummary {
  totalVerifications: number;
  avgConfidence: number;
  avgProcessingTime: number;
  totalCost: number;
}

export interface AnalyticsData {
  trends: TrendDataPoint[];
  verdicts: VerdictData[];
  paradigms: ParadigmData[];
  costByProvider: ProviderCost[];
  processingTime: ProcessingTimeData[];
  summary: AnalyticsSummary;
}

export interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
  meta: {
    range: TimeRange;
    startDate: string;
    endDate: string;
  };
}

// =============================================================================
// ADVANCED ANALYTICS TYPES (re-exported from advanced-queries.ts)
// =============================================================================

export type {
  ParadigmFPRData,
  FPRTrendDataPoint,
  CostEfficiencyData,
  ProviderCostComparison,
  ConfidenceBucket,
  ParadigmCalibration,
  AdvancedAnalyticsSummary,
  AdvancedAnalyticsData,
} from './advanced-queries';
