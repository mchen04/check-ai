export type TimeRange = '7d' | '30d' | '90d';

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
