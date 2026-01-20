/**
 * Analytics Module Barrel Export
 */

// Types
export {
  type TimeRange,
  PARADIGM_DISPLAY_NAMES,
  getDateRangeStart,
  type TrendDataPoint,
  type VerdictData,
  type ParadigmData,
  type ProviderCost,
  type ProcessingTimeData,
  type AnalyticsSummary,
  type AnalyticsData,
  type AnalyticsResponse,
} from './types';

// Standard queries
export { getAnalyticsData, getDateRange } from './queries';

// Advanced queries
export {
  type ParadigmFPRData,
  type FPRTrendDataPoint,
  type CostEfficiencyData,
  type ProviderCostComparison,
  type ConfidenceBucket,
  type ParadigmCalibration,
  type AdvancedAnalyticsSummary,
  type AdvancedAnalyticsData,
  getParadigmFPR,
  getFPRTrends,
  getCostEfficiency,
  getProviderCostComparison,
  getConfidenceCalibration,
  getAdvancedAnalyticsData,
} from './advanced-queries';

// Aggregation service
export {
  runDailyAggregation,
  backfillAggregations,
} from './aggregation-service';
