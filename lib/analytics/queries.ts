import { db } from '@/utils/db/db';
import {
  verificationsTable,
  paradigmResultsTable,
  usageTable,
} from '@/utils/db/schema';
import { eq, and, gte, sql, count, isNotNull, desc } from 'drizzle-orm';
import { subDays } from 'date-fns';
import type {
  TimeRange,
  TrendDataPoint,
  VerdictData,
  ParadigmData,
  ProviderCost,
  ProcessingTimeData,
  AnalyticsSummary,
  AnalyticsData,
} from './types';

// Paradigm display names mapping
const PARADIGM_DISPLAY_NAMES: Record<string, string> = {
  semantic: 'Semantic',
  reasoning: 'Reasoning',
  tool: 'Tool',
  biprm: 'BiPRM',
  ensemble: 'Ensemble',
  entropy: 'Entropy',
  formal: 'Formal',
};

// Calculate start date from time range
function getStartDate(range: TimeRange): Date {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return subDays(new Date(), days);
}

// Get verification trends over time
async function getVerificationTrends(
  orgId: string,
  startDate: Date
): Promise<TrendDataPoint[]> {
  const results = await db
    .select({
      date: sql<string>`DATE(${verificationsTable.createdAt})`.as('date'),
      total: count().as('total'),
      completed: sql<number>`COUNT(*) FILTER (WHERE ${verificationsTable.status} = 'completed')`.as('completed'),
      failed: sql<number>`COUNT(*) FILTER (WHERE ${verificationsTable.status} = 'failed')`.as('failed'),
      escalated: sql<number>`COUNT(*) FILTER (WHERE ${verificationsTable.status} = 'escalated')`.as('escalated'),
    })
    .from(verificationsTable)
    .where(
      and(
        eq(verificationsTable.orgId, orgId),
        gte(verificationsTable.createdAt, startDate)
      )
    )
    .groupBy(sql`DATE(${verificationsTable.createdAt})`)
    .orderBy(sql`DATE(${verificationsTable.createdAt})`);

  return results.map((r) => ({
    date: r.date,
    total: Number(r.total),
    completed: Number(r.completed),
    failed: Number(r.failed),
    escalated: Number(r.escalated),
  }));
}

// Get verdict distribution
async function getVerdictDistribution(
  orgId: string,
  startDate: Date
): Promise<VerdictData[]> {
  const results = await db
    .select({
      verdict: verificationsTable.finalVerdict,
      count: count(),
    })
    .from(verificationsTable)
    .where(
      and(
        eq(verificationsTable.orgId, orgId),
        gte(verificationsTable.createdAt, startDate),
        isNotNull(verificationsTable.finalVerdict)
      )
    )
    .groupBy(verificationsTable.finalVerdict);

  const total = results.reduce((sum, r) => sum + Number(r.count), 0);

  return results.map((r) => ({
    verdict: r.verdict as 'true' | 'false' | 'uncertain',
    count: Number(r.count),
    percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
  }));
}

// Get paradigm performance metrics
async function getParadigmPerformance(
  orgId: string,
  startDate: Date
): Promise<ParadigmData[]> {
  const results = await db
    .select({
      paradigmType: paradigmResultsTable.paradigmType,
      avgConfidence: sql<number>`AVG(CAST(${paradigmResultsTable.confidence} AS DECIMAL))`.as('avg_confidence'),
      avgProcessingTime: sql<number>`AVG(${paradigmResultsTable.processingTimeMs})`.as('avg_processing_time'),
      totalCost: sql<number>`COALESCE(SUM(${paradigmResultsTable.costCents}), 0)`.as('total_cost'),
      count: count().as('count'),
      successCount: sql<number>`COUNT(*) FILTER (WHERE ${paradigmResultsTable.verdict} IS NOT NULL AND ${paradigmResultsTable.errorMessage} IS NULL)`.as('success_count'),
    })
    .from(paradigmResultsTable)
    .innerJoin(
      verificationsTable,
      eq(paradigmResultsTable.verificationId, verificationsTable.id)
    )
    .where(
      and(
        eq(verificationsTable.orgId, orgId),
        gte(verificationsTable.createdAt, startDate)
      )
    )
    .groupBy(paradigmResultsTable.paradigmType);

  return results.map((r) => ({
    paradigmType: r.paradigmType,
    displayName: PARADIGM_DISPLAY_NAMES[r.paradigmType] || r.paradigmType,
    avgConfidence: Number(r.avgConfidence) || 0,
    avgProcessingTime: Number(r.avgProcessingTime) || 0,
    totalCost: Number(r.totalCost),
    count: Number(r.count),
    successRate: Number(r.count) > 0
      ? (Number(r.successCount) / Number(r.count)) * 100
      : 0,
  }));
}

// Get cost breakdown by provider
async function getCostByProvider(
  orgId: string,
  startDate: Date
): Promise<ProviderCost[]> {
  const results = await db
    .select({
      provider: usageTable.provider,
      totalCost: sql<number>`COALESCE(SUM(${usageTable.costCents}), 0)`.as('total_cost'),
      totalTokens: sql<number>`COALESCE(SUM(${usageTable.inputTokens} + ${usageTable.outputTokens}), 0)`.as('total_tokens'),
    })
    .from(usageTable)
    .where(
      and(
        eq(usageTable.orgId, orgId),
        gte(usageTable.createdAt, startDate)
      )
    )
    .groupBy(usageTable.provider)
    .orderBy(desc(sql`SUM(${usageTable.costCents})`));

  const totalCost = results.reduce((sum, r) => sum + Number(r.totalCost), 0);

  return results.map((r) => ({
    provider: r.provider,
    totalCost: Number(r.totalCost),
    totalTokens: Number(r.totalTokens),
    percentage: totalCost > 0 ? (Number(r.totalCost) / totalCost) * 100 : 0,
  }));
}

// Get processing time metrics over time
async function getProcessingTimeMetrics(
  orgId: string,
  startDate: Date
): Promise<ProcessingTimeData[]> {
  const results = await db
    .select({
      date: sql<string>`DATE(${verificationsTable.createdAt})`.as('date'),
      avgProcessingTime: sql<number>`AVG(${verificationsTable.processingTimeMs})`.as('avg_processing_time'),
      p50: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${verificationsTable.processingTimeMs})`.as('p50'),
      p95: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${verificationsTable.processingTimeMs})`.as('p95'),
    })
    .from(verificationsTable)
    .where(
      and(
        eq(verificationsTable.orgId, orgId),
        gte(verificationsTable.createdAt, startDate),
        isNotNull(verificationsTable.processingTimeMs)
      )
    )
    .groupBy(sql`DATE(${verificationsTable.createdAt})`)
    .orderBy(sql`DATE(${verificationsTable.createdAt})`);

  return results.map((r) => ({
    date: r.date,
    avgProcessingTime: Number(r.avgProcessingTime) || 0,
    p50: Number(r.p50) || 0,
    p95: Number(r.p95) || 0,
  }));
}

// Get summary statistics
async function getSummaryStats(
  orgId: string,
  startDate: Date
): Promise<AnalyticsSummary> {
  const [result] = await db
    .select({
      totalVerifications: count().as('total'),
      avgConfidence: sql<number>`AVG(CAST(${verificationsTable.confidenceScore} AS DECIMAL))`.as('avg_confidence'),
      avgProcessingTime: sql<number>`AVG(${verificationsTable.processingTimeMs})`.as('avg_processing_time'),
      totalCost: sql<number>`COALESCE(SUM(${verificationsTable.costCents}), 0)`.as('total_cost'),
    })
    .from(verificationsTable)
    .where(
      and(
        eq(verificationsTable.orgId, orgId),
        gte(verificationsTable.createdAt, startDate)
      )
    );

  return {
    totalVerifications: Number(result?.totalVerifications) || 0,
    avgConfidence: Number(result?.avgConfidence) || 0,
    avgProcessingTime: Number(result?.avgProcessingTime) || 0,
    totalCost: Number(result?.totalCost) || 0,
  };
}

// Main function to get all analytics data
export async function getAnalyticsData(
  orgId: string,
  range: TimeRange
): Promise<AnalyticsData> {
  const startDate = getStartDate(range);

  // Execute all queries in parallel for better performance
  const [trends, verdicts, paradigms, costByProvider, processingTime, summary] =
    await Promise.all([
      getVerificationTrends(orgId, startDate),
      getVerdictDistribution(orgId, startDate),
      getParadigmPerformance(orgId, startDate),
      getCostByProvider(orgId, startDate),
      getProcessingTimeMetrics(orgId, startDate),
      getSummaryStats(orgId, startDate),
    ]);

  return {
    trends,
    verdicts,
    paradigms,
    costByProvider,
    processingTime,
    summary,
  };
}

// Export helper for getting date range
export function getDateRange(range: TimeRange): { startDate: Date; endDate: Date } {
  return {
    startDate: getStartDate(range),
    endDate: new Date(),
  };
}
