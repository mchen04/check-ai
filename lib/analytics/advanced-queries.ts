/**
 * Advanced Analytics Queries
 * - False Positive Rate (FPR) by paradigm
 * - Cost efficiency metrics
 * - Confidence calibration
 */

import { eq, and, gte, sql, count, isNotNull, desc } from 'drizzle-orm';
import { db } from '@/utils/db/db';
import {
  verificationsTable,
  paradigmResultsTable,
  escalationsTable,
  usageTable,
} from '@/utils/db/schema';
import { clampRatio } from '@/lib/utils';
import { TimeRange, PARADIGM_DISPLAY_NAMES, getDateRangeStart } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface ParadigmFPRData {
  paradigmType: string;
  displayName: string;
  totalResolved: number;
  falsePositives: number;
  truePositives: number;
  fpr: number; // False Positive Rate (0-1)
  accuracy: number; // Overall accuracy (0-1)
}

export interface FPRTrendDataPoint {
  date: string;
  fpr: number;
  totalResolved: number;
}

export interface CostEfficiencyData {
  paradigmType: string;
  displayName: string;
  costPerVerification: number; // cents
  costPerAccurateVerification: number; // cents
  totalVerifications: number;
  // Verified accuracy - only items with human feedback
  verifiedAccurateCount: number;
  verifiedTotalCount: number;
  verifiedAccuracy: number;
  // Estimated accuracy - assumes non-escalated items are correct
  estimatedAccurateCount: number;
  estimatedAccuracy: number;
  totalCostCents: number;
  efficiencyScore: number; // verifiedAccuracy / cost (uses verified when available)
}

export interface ProviderCostComparison {
  provider: string;
  avgCostPerVerification: number;
  avgCostPerToken: number;
  totalVerifications: number;
  totalCostCents: number;
  avgAccuracy: number;
}

export interface ConfidenceBucket {
  bucket: string; // e.g., "0-10%", "10-20%"
  minConfidence: number;
  maxConfidence: number;
  count: number;
  // Verified accuracy - only items with human feedback
  verifiedCount: number;
  verifiedAccuracy: number;
  // Estimated accuracy - assumes non-escalated items are correct
  estimatedAccuracy: number;
  avgConfidence: number;
  calibrationError: number; // |verifiedAccuracy - avgConfidence| or estimated if no verified
}

export interface ParadigmCalibration {
  paradigmType: string;
  displayName: string;
  buckets: ConfidenceBucket[];
  overallCalibrationError: number;
  isOverconfident: boolean;
  isUnderconfident: boolean;
}

export interface AdvancedAnalyticsSummary {
  overallFPR: number;
  bestPerformingParadigm: string | null;
  mostCostEfficient: string | null;
  avgCalibrationError: number;
}

export interface AdvancedAnalyticsData {
  paradigmFPR: ParadigmFPRData[];
  fprTrends: FPRTrendDataPoint[];
  costEfficiency: CostEfficiencyData[];
  providerCostComparison: ProviderCostComparison[];
  calibration: ParadigmCalibration[];
  advancedSummary: AdvancedAnalyticsSummary;
}

// =============================================================================
// FALSE POSITIVE RATE QUERIES
// =============================================================================

/**
 * Calculate FPR by paradigm based on human-resolved escalations
 * FPR = (AI said true, human said false) / (total human resolved)
 */
export async function getParadigmFPR(
  orgId: string,
  startDate: Date
): Promise<ParadigmFPRData[]> {
  // Join escalations with verifications and paradigm results
  // Compare AI verdict vs human verdict
  const results = await db
    .select({
      paradigmType: paradigmResultsTable.paradigmType,
      // Total resolved escalations where we have both AI and human verdicts
      totalResolved: sql<number>`COUNT(DISTINCT ${escalationsTable.id}) FILTER (
        WHERE ${escalationsTable.humanVerdict} IS NOT NULL
      )`.as('total_resolved'),
      // False positives: AI said true, human said false
      falsePositives: sql<number>`COUNT(DISTINCT ${escalationsTable.id}) FILTER (
        WHERE ${paradigmResultsTable.verdict} = 'true'
        AND ${escalationsTable.humanVerdict} = 'false'
      )`.as('false_positives'),
      // True positives: AI said true, human said true
      truePositives: sql<number>`COUNT(DISTINCT ${escalationsTable.id}) FILTER (
        WHERE ${paradigmResultsTable.verdict} = 'true'
        AND ${escalationsTable.humanVerdict} = 'true'
      )`.as('true_positives'),
      // AI correct: AI verdict matches human verdict (must have human verdict)
      correct: sql<number>`COUNT(DISTINCT ${escalationsTable.id}) FILTER (
        WHERE ${escalationsTable.humanVerdict} IS NOT NULL
        AND ${paradigmResultsTable.verdict} = ${escalationsTable.humanVerdict}
      )`.as('correct'),
    })
    .from(paradigmResultsTable)
    .innerJoin(
      verificationsTable,
      eq(paradigmResultsTable.verificationId, verificationsTable.id)
    )
    .innerJoin(
      escalationsTable,
      eq(escalationsTable.verificationId, verificationsTable.id)
    )
    .where(
      and(
        eq(verificationsTable.orgId, orgId),
        gte(verificationsTable.createdAt, startDate),
        isNotNull(escalationsTable.humanVerdict)
      )
    )
    .groupBy(paradigmResultsTable.paradigmType);

  return results.map((r) => {
    const totalResolved = Number(r.totalResolved) || 0;
    const falsePositives = Number(r.falsePositives) || 0;
    const correct = Number(r.correct) || 0;

    // Clamp values to valid 0-1 range to handle edge cases
    const rawFpr = totalResolved > 0 ? falsePositives / totalResolved : 0;
    const rawAccuracy = totalResolved > 0 ? correct / totalResolved : 0;

    return {
      paradigmType: r.paradigmType,
      displayName: PARADIGM_DISPLAY_NAMES[r.paradigmType] || r.paradigmType,
      totalResolved,
      falsePositives,
      truePositives: Number(r.truePositives) || 0,
      fpr: clampRatio(rawFpr),
      accuracy: clampRatio(rawAccuracy),
    };
  });
}

/**
 * Get FPR trends over time
 * Uses paradigm verdict (consistent with getParadigmFPR) to track FPR trends
 */
export async function getFPRTrends(
  orgId: string,
  startDate: Date
): Promise<FPRTrendDataPoint[]> {
  // Note: We aggregate at the paradigm level and pick the most common verdict
  // for consistency with getParadigmFPR. This joins with paradigm_results.
  const results = await db
    .select({
      date: sql<string>`DATE(${escalationsTable.resolvedAt})`.as('date'),
      totalResolved: sql<number>`COUNT(DISTINCT ${escalationsTable.id})`.as('total_resolved'),
      // False positives: any paradigm said true but human said false
      falsePositives: sql<number>`COUNT(DISTINCT ${escalationsTable.id}) FILTER (
        WHERE ${paradigmResultsTable.verdict} = 'true'
        AND ${escalationsTable.humanVerdict} = 'false'
      )`.as('false_positives'),
    })
    .from(escalationsTable)
    .innerJoin(
      verificationsTable,
      eq(escalationsTable.verificationId, verificationsTable.id)
    )
    .innerJoin(
      paradigmResultsTable,
      eq(paradigmResultsTable.verificationId, verificationsTable.id)
    )
    .where(
      and(
        eq(verificationsTable.orgId, orgId),
        gte(escalationsTable.resolvedAt, startDate),
        isNotNull(escalationsTable.humanVerdict)
      )
    )
    .groupBy(sql`DATE(${escalationsTable.resolvedAt})`)
    .orderBy(sql`DATE(${escalationsTable.resolvedAt})`);

  return results.map((r) => {
    const totalResolved = Number(r.totalResolved) || 0;
    const falsePositives = Number(r.falsePositives) || 0;

    // Clamp FPR to valid 0-1 range
    const rawFpr = totalResolved > 0 ? falsePositives / totalResolved : 0;

    return {
      date: r.date,
      fpr: clampRatio(rawFpr),
      totalResolved,
    };
  });
}

// =============================================================================
// COST EFFICIENCY QUERIES
// =============================================================================

/**
 * Calculate cost efficiency by paradigm
 * Shows both verified accuracy (with human feedback) and estimated accuracy
 * Efficiency = verifiedAccuracy / cost_per_verification
 */
export async function getCostEfficiency(
  orgId: string,
  startDate: Date
): Promise<CostEfficiencyData[]> {
  const results = await db
    .select({
      paradigmType: paradigmResultsTable.paradigmType,
      totalVerifications: count().as('total_verifications'),
      totalCostCents: sql<number>`COALESCE(SUM(${paradigmResultsTable.costCents}), 0)`.as('total_cost'),
      // Verified accuracy: only items with human feedback
      verifiedAccurate: sql<number>`COUNT(*) FILTER (
        WHERE ${escalationsTable.humanVerdict} IS NOT NULL
        AND ${paradigmResultsTable.verdict} = ${escalationsTable.humanVerdict}
      )`.as('verified_accurate'),
      verifiedTotal: sql<number>`COUNT(*) FILTER (
        WHERE ${escalationsTable.humanVerdict} IS NOT NULL
      )`.as('verified_total'),
      // Estimated accuracy: assumes non-escalated items are correct
      estimatedAccurate: sql<number>`COUNT(*) FILTER (
        WHERE (${escalationsTable.humanVerdict} IS NULL)
        OR (${escalationsTable.humanVerdict} IS NOT NULL
            AND ${paradigmResultsTable.verdict} = ${escalationsTable.humanVerdict})
      )`.as('estimated_accurate'),
    })
    .from(paradigmResultsTable)
    .innerJoin(
      verificationsTable,
      eq(paradigmResultsTable.verificationId, verificationsTable.id)
    )
    .leftJoin(
      escalationsTable,
      eq(escalationsTable.verificationId, verificationsTable.id)
    )
    .where(
      and(
        eq(verificationsTable.orgId, orgId),
        gte(verificationsTable.createdAt, startDate),
        isNotNull(paradigmResultsTable.verdict)
      )
    )
    .groupBy(paradigmResultsTable.paradigmType);

  return results.map((r) => {
    const totalVerifications = Number(r.totalVerifications) || 0;
    const totalCostCents = Number(r.totalCostCents) || 0;
    const verifiedAccurateCount = Number(r.verifiedAccurate) || 0;
    const verifiedTotalCount = Number(r.verifiedTotal) || 0;
    const estimatedAccurateCount = Number(r.estimatedAccurate) || 0;

    // Calculate and clamp accuracy values to valid 0-1 range
    const rawVerifiedAccuracy = verifiedTotalCount > 0 ? verifiedAccurateCount / verifiedTotalCount : 0;
    const rawEstimatedAccuracy = totalVerifications > 0 ? estimatedAccurateCount / totalVerifications : 0;
    const verifiedAccuracy = Math.min(1, Math.max(0, rawVerifiedAccuracy));
    const estimatedAccuracy = Math.min(1, Math.max(0, rawEstimatedAccuracy));

    const costPerVerification = totalVerifications > 0 ? totalCostCents / totalVerifications : 0;
    // Use verified accuracy for cost per accurate when we have feedback data
    const accuracyForCost = verifiedTotalCount > 0 ? verifiedAccuracy : estimatedAccuracy;
    const accurateCount = verifiedTotalCount > 0 ? verifiedAccurateCount : estimatedAccurateCount;
    const costPerAccurateVerification = accurateCount > 0 ? totalCostCents / accurateCount : 0;

    return {
      paradigmType: r.paradigmType,
      displayName: PARADIGM_DISPLAY_NAMES[r.paradigmType] || r.paradigmType,
      costPerVerification,
      costPerAccurateVerification,
      totalVerifications,
      verifiedAccurateCount,
      verifiedTotalCount,
      verifiedAccuracy,
      estimatedAccurateCount,
      estimatedAccuracy,
      totalCostCents,
      // Efficiency uses verified accuracy when available, otherwise estimated
      efficiencyScore: costPerVerification > 0 ? (accuracyForCost * 10000) / costPerVerification : 0,
    };
  });
}

/**
 * Get cost comparison by provider
 */
export async function getProviderCostComparison(
  orgId: string,
  startDate: Date
): Promise<ProviderCostComparison[]> {
  const results = await db
    .select({
      provider: usageTable.provider,
      totalVerifications: sql<number>`COUNT(DISTINCT ${usageTable.verificationId})`.as('total_verifications'),
      totalCostCents: sql<number>`COALESCE(SUM(${usageTable.costCents}), 0)`.as('total_cost'),
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

  // For accuracy by provider, we need a separate query
  const accuracyResults = await db
    .select({
      provider: usageTable.provider,
      totalResults: count().as('total_results'),
      correctResults: sql<number>`COUNT(*) FILTER (
        WHERE ${paradigmResultsTable.verdict} = COALESCE(${escalationsTable.humanVerdict}, ${paradigmResultsTable.verdict})
      )`.as('correct_results'),
    })
    .from(usageTable)
    .innerJoin(
      verificationsTable,
      eq(usageTable.verificationId, verificationsTable.id)
    )
    .innerJoin(
      paradigmResultsTable,
      eq(paradigmResultsTable.verificationId, verificationsTable.id)
    )
    .leftJoin(
      escalationsTable,
      eq(escalationsTable.verificationId, verificationsTable.id)
    )
    .where(
      and(
        eq(usageTable.orgId, orgId),
        gte(usageTable.createdAt, startDate),
        eq(paradigmResultsTable.provider, usageTable.provider)
      )
    )
    .groupBy(usageTable.provider);

  const accuracyMap = new Map(
    accuracyResults.map((r) => [
      r.provider,
      Number(r.totalResults) > 0 ? Number(r.correctResults) / Number(r.totalResults) : 0,
    ])
  );

  return results.map((r) => {
    const totalVerifications = Number(r.totalVerifications) || 0;
    const totalCostCents = Number(r.totalCostCents) || 0;
    const totalTokens = Number(r.totalTokens) || 0;

    return {
      provider: r.provider,
      avgCostPerVerification: totalVerifications > 0 ? totalCostCents / totalVerifications : 0,
      avgCostPerToken: totalTokens > 0 ? totalCostCents / totalTokens : 0,
      totalVerifications,
      totalCostCents,
      avgAccuracy: accuracyMap.get(r.provider) || 0,
    };
  });
}

// =============================================================================
// CONFIDENCE CALIBRATION QUERIES
// =============================================================================

/**
 * Calculate confidence calibration by paradigm
 * Compares predicted confidence vs actual accuracy in each bucket
 *
 * Uses SQL-side bucketing via CASE WHEN + GROUP BY to return ~70 rows
 * (7 paradigms x 10 buckets) instead of fetching 100K+ rows into JS memory.
 */
export async function getConfidenceCalibration(
  orgId: string,
  startDate: Date
): Promise<ParadigmCalibration[]> {
  // Bucket definitions for post-processing (labels + boundaries)
  const bucketDefs = [
    { min: 0, max: 0.1, label: '0-10%' },
    { min: 0.1, max: 0.2, label: '10-20%' },
    { min: 0.2, max: 0.3, label: '20-30%' },
    { min: 0.3, max: 0.4, label: '30-40%' },
    { min: 0.4, max: 0.5, label: '40-50%' },
    { min: 0.5, max: 0.6, label: '50-60%' },
    { min: 0.6, max: 0.7, label: '60-70%' },
    { min: 0.7, max: 0.8, label: '70-80%' },
    { min: 0.8, max: 0.9, label: '80-90%' },
    { min: 0.9, max: 1.01, label: '90-100%' },
  ];

  // SQL-side bucketing: returns ~70 rows instead of 100K+
  const bucketResults = await db
    .select({
      paradigmType: paradigmResultsTable.paradigmType,
      bucket: sql<number>`FLOOR(CAST(${paradigmResultsTable.confidence} AS numeric) * 10)`.as('bucket'),
      count: sql<number>`COUNT(*)`.as('count'),
      avgConfidence: sql<number>`AVG(CAST(${paradigmResultsTable.confidence} AS numeric))`.as('avg_confidence'),
      verifiedCount: sql<number>`COUNT(*) FILTER (WHERE ${escalationsTable.humanVerdict} IS NOT NULL)`.as('verified_count'),
      verifiedCorrect: sql<number>`COUNT(*) FILTER (
        WHERE ${escalationsTable.humanVerdict} IS NOT NULL
        AND ${paradigmResultsTable.verdict} = ${escalationsTable.humanVerdict}
      )`.as('verified_correct'),
      estimatedCorrect: sql<number>`COUNT(*) FILTER (
        WHERE ${escalationsTable.humanVerdict} IS NULL
        OR (${escalationsTable.humanVerdict} IS NOT NULL
            AND ${paradigmResultsTable.verdict} = ${escalationsTable.humanVerdict})
      )`.as('estimated_correct'),
    })
    .from(paradigmResultsTable)
    .innerJoin(
      verificationsTable,
      eq(paradigmResultsTable.verificationId, verificationsTable.id)
    )
    .leftJoin(
      escalationsTable,
      eq(escalationsTable.verificationId, verificationsTable.id)
    )
    .where(
      and(
        eq(verificationsTable.orgId, orgId),
        gte(verificationsTable.createdAt, startDate),
        isNotNull(paradigmResultsTable.confidence),
        isNotNull(paradigmResultsTable.verdict)
      )
    )
    .groupBy(
      paradigmResultsTable.paradigmType,
      sql`FLOOR(CAST(${paradigmResultsTable.confidence} AS numeric) * 10)`
    );

  // Also get per-paradigm overall stats for over/under confidence detection
  const overallResults = await db
    .select({
      paradigmType: paradigmResultsTable.paradigmType,
      totalCount: sql<number>`COUNT(*)`.as('total_count'),
      avgConfidence: sql<number>`AVG(CAST(${paradigmResultsTable.confidence} AS numeric))`.as('avg_confidence'),
      verifiedCount: sql<number>`COUNT(*) FILTER (WHERE ${escalationsTable.humanVerdict} IS NOT NULL)`.as('verified_count'),
      verifiedCorrect: sql<number>`COUNT(*) FILTER (
        WHERE ${escalationsTable.humanVerdict} IS NOT NULL
        AND ${paradigmResultsTable.verdict} = ${escalationsTable.humanVerdict}
      )`.as('verified_correct'),
      estimatedCorrect: sql<number>`COUNT(*) FILTER (
        WHERE ${escalationsTable.humanVerdict} IS NULL
        OR (${escalationsTable.humanVerdict} IS NOT NULL
            AND ${paradigmResultsTable.verdict} = ${escalationsTable.humanVerdict})
      )`.as('estimated_correct'),
    })
    .from(paradigmResultsTable)
    .innerJoin(
      verificationsTable,
      eq(paradigmResultsTable.verificationId, verificationsTable.id)
    )
    .leftJoin(
      escalationsTable,
      eq(escalationsTable.verificationId, verificationsTable.id)
    )
    .where(
      and(
        eq(verificationsTable.orgId, orgId),
        gte(verificationsTable.createdAt, startDate),
        isNotNull(paradigmResultsTable.confidence),
        isNotNull(paradigmResultsTable.verdict)
      )
    )
    .groupBy(paradigmResultsTable.paradigmType);

  // Group bucket results by paradigm
  const paradigmBuckets = new Map<string, typeof bucketResults>();
  for (const r of bucketResults) {
    const existing = paradigmBuckets.get(r.paradigmType) || [];
    existing.push(r);
    paradigmBuckets.set(r.paradigmType, existing);
  }

  const overallMap = new Map<string, (typeof overallResults)[number]>(
    overallResults.map((r) => [r.paradigmType, r])
  );

  const calibrations: ParadigmCalibration[] = [];

  for (const [paradigmType, rows] of Array.from(paradigmBuckets.entries())) {
    const processedBuckets: ConfidenceBucket[] = [];
    let totalCalibrationError = 0;
    let totalWeightedCount = 0;

    for (const row of rows) {
      const bucketIdx = Math.min(Number(row.bucket), 9); // Clamp confidence=1.0 into the 90-100% bucket
      const def = bucketDefs[bucketIdx];
      if (!def) continue;

      const cnt = Number(row.count) || 0;
      const avgConf = Number(row.avgConfidence) || 0;
      const verifiedCnt = Number(row.verifiedCount) || 0;
      const verifiedCorr = Number(row.verifiedCorrect) || 0;
      const estimatedCorr = Number(row.estimatedCorrect) || 0;

      const verifiedAccuracy = verifiedCnt > 0 ? verifiedCorr / verifiedCnt : 0;
      const estimatedAccuracy = cnt > 0 ? estimatedCorr / cnt : 0;

      // Use verified accuracy for calibration error when we have feedback, otherwise estimated
      const accuracyForError = verifiedCnt > 0 ? verifiedAccuracy : estimatedAccuracy;
      const calibrationError = Math.abs(accuracyForError - avgConf);

      processedBuckets.push({
        bucket: def.label,
        minConfidence: def.min,
        maxConfidence: def.max,
        count: cnt,
        verifiedCount: verifiedCnt,
        verifiedAccuracy,
        estimatedAccuracy,
        avgConfidence: avgConf,
        calibrationError,
      });

      // Weight calibration error by verified count when available
      const weightedCount = verifiedCnt > 0 ? verifiedCnt : cnt;
      totalCalibrationError += calibrationError * weightedCount;
      totalWeightedCount += weightedCount;
    }

    const overallCalibrationError = totalWeightedCount > 0 ? totalCalibrationError / totalWeightedCount : 0;

    // Determine if paradigm is over/under confident using overall stats
    const overall = overallMap.get(paradigmType);
    const avgConfidenceOverall = Number(overall?.avgConfidence) || 0;
    const overallVerifiedCnt = Number(overall?.verifiedCount) || 0;
    const overallVerifiedCorr = Number(overall?.verifiedCorrect) || 0;
    const overallTotalCnt = Number(overall?.totalCount) || 0;
    const overallEstimatedCorr = Number(overall?.estimatedCorrect) || 0;

    const verifiedAccuracyOverall = overallVerifiedCnt > 0 ? overallVerifiedCorr / overallVerifiedCnt : 0;
    const estimatedAccuracyOverall = overallTotalCnt > 0 ? overallEstimatedCorr / overallTotalCnt : 0;
    const accuracyToCompare = overallVerifiedCnt > 0 ? verifiedAccuracyOverall : estimatedAccuracyOverall;

    calibrations.push({
      paradigmType,
      displayName: PARADIGM_DISPLAY_NAMES[paradigmType] || paradigmType,
      buckets: processedBuckets,
      overallCalibrationError,
      isOverconfident: avgConfidenceOverall > accuracyToCompare + 0.05,
      isUnderconfident: avgConfidenceOverall < accuracyToCompare - 0.05,
    });
  }

  return calibrations;
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Get all advanced analytics data
 */
export async function getAdvancedAnalyticsData(
  orgId: string,
  range: TimeRange
): Promise<AdvancedAnalyticsData> {
  const startDate = getDateRangeStart(range);

  // Execute all queries in parallel
  const [paradigmFPR, fprTrends, costEfficiency, providerCostComparison, calibration] =
    await Promise.all([
      getParadigmFPR(orgId, startDate),
      getFPRTrends(orgId, startDate),
      getCostEfficiency(orgId, startDate),
      getProviderCostComparison(orgId, startDate),
      getConfidenceCalibration(orgId, startDate),
    ]);

  // Calculate summary metrics
  const totalFPResolved = paradigmFPR.reduce((sum, p) => sum + p.totalResolved, 0);
  const totalFP = paradigmFPR.reduce((sum, p) => sum + p.falsePositives, 0);
  const overallFPR = totalFPResolved > 0 ? totalFP / totalFPResolved : 0;

  // Best performing paradigm by accuracy
  const bestPerforming = paradigmFPR.length > 0
    ? paradigmFPR.reduce((best, p) => (p.accuracy > best.accuracy ? p : best))
    : null;

  // Most cost efficient paradigm
  const mostEfficient = costEfficiency.length > 0
    ? costEfficiency.reduce((best, p) => (p.efficiencyScore > best.efficiencyScore ? p : best))
    : null;

  // Average calibration error
  const avgCalibrationError =
    calibration.length > 0
      ? calibration.reduce((sum, c) => sum + c.overallCalibrationError, 0) / calibration.length
      : 0;

  return {
    paradigmFPR,
    fprTrends,
    costEfficiency,
    providerCostComparison,
    calibration,
    advancedSummary: {
      overallFPR,
      bestPerformingParadigm: bestPerforming?.displayName || null,
      mostCostEfficient: mostEfficient?.displayName || null,
      avgCalibrationError,
    },
  };
}
