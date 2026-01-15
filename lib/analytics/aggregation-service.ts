/**
 * Analytics Aggregation Service
 * Background job to pre-aggregate daily analytics metrics
 */

import { db } from '@/utils/db/db';
import {
  verificationsTable,
  paradigmResultsTable,
  escalationsTable,
  analyticsDailySnapshotsTable,
  organizationsTable,
} from '@/utils/db/schema';
import { eq, and, gte, lt, sql, isNotNull } from 'drizzle-orm';
import { startOfDay, subDays, format } from 'date-fns';
import { createLogger } from '@/lib/logger';

const log = createLogger('Analytics');

import type { ConfidenceCalibrationBuckets, ConfidenceCalibrationBucket, ParadigmType } from '@/utils/db/schema';

interface DailySnapshot {
  orgId: string;
  date: Date;
  paradigmType: string;
  totalVerifications: number;
  escalatedCount: number;
  resolvedCount: number;
  falsePositives: number;
  truePositives: number;
  confidenceBuckets: ConfidenceCalibrationBuckets;
  totalCostCents: number;
  avgCostPerVerification: string | null;
  avgCostPerAccurate: string | null;
  avgConfidence: string | null;
  avgProcessingTimeMs: number | null;
}

/**
 * Aggregate analytics for a specific date and organization
 */
export async function aggregateDayForOrg(
  orgId: string,
  date: Date
): Promise<DailySnapshot[]> {
  const startDate = startOfDay(date);
  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

  // Get paradigm results for the day
  const results = await db
    .select({
      paradigmType: paradigmResultsTable.paradigmType,
      verificationId: verificationsTable.id,
      confidence: paradigmResultsTable.confidence,
      verdict: paradigmResultsTable.verdict,
      costCents: paradigmResultsTable.costCents,
      processingTimeMs: paradigmResultsTable.processingTimeMs,
      humanVerdict: escalationsTable.humanVerdict,
      escalationId: escalationsTable.id,
      resolvedAt: escalationsTable.resolvedAt,
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
        lt(verificationsTable.createdAt, endDate)
      )
    );

  // Group by paradigm
  const paradigmMap = new Map<string, typeof results>();

  for (const r of results) {
    const existing = paradigmMap.get(r.paradigmType) || [];
    existing.push(r);
    paradigmMap.set(r.paradigmType, existing);
  }

  const snapshots: DailySnapshot[] = [];

  for (const [paradigmType, data] of Array.from(paradigmMap.entries())) {
    // Basic counts
    const totalVerifications = data.length;
    const escalatedCount = data.filter((d) => d.escalationId !== null).length;
    const resolvedCount = data.filter((d) => d.humanVerdict !== null).length;

    // FPR metrics
    const falsePositives = data.filter(
      (d) => d.verdict === 'true' && d.humanVerdict === 'false'
    ).length;
    const truePositives = data.filter(
      (d) => d.verdict === 'true' && d.humanVerdict === 'true'
    ).length;

    // Cost metrics
    const totalCostCents = data.reduce(
      (sum, d) => sum + (Number(d.costCents) || 0),
      0
    );
    const avgCostPerVerification =
      totalVerifications > 0
        ? (totalCostCents / totalVerifications).toFixed(4)
        : null;

    // Accuracy for cost efficiency
    const accurateCount = data.filter((d) => {
      const groundTruth = d.humanVerdict || d.verdict;
      return d.verdict === groundTruth;
    }).length;
    const avgCostPerAccurate =
      accurateCount > 0 ? (totalCostCents / accurateCount).toFixed(4) : null;

    // Confidence metrics
    const validConfidences = data.filter((d) => d.confidence !== null);
    const avgConfidence =
      validConfidences.length > 0
        ? (
            validConfidences.reduce(
              (sum, d) => sum + (Number(d.confidence) || 0),
              0
            ) / validConfidences.length
          ).toFixed(4)
        : null;

    // Processing time
    const validTimes = data.filter((d) => d.processingTimeMs !== null);
    const avgProcessingTimeMs =
      validTimes.length > 0
        ? Math.round(
            validTimes.reduce(
              (sum, d) => sum + (Number(d.processingTimeMs) || 0),
              0
            ) / validTimes.length
          )
        : null;

    // Confidence calibration buckets - matching schema format
    const bucketRanges: { min: number; max: number; key: keyof ConfidenceCalibrationBuckets }[] = [
      { min: 0, max: 0.1, key: '0.0-0.1' },
      { min: 0.1, max: 0.2, key: '0.1-0.2' },
      { min: 0.2, max: 0.3, key: '0.2-0.3' },
      { min: 0.3, max: 0.4, key: '0.3-0.4' },
      { min: 0.4, max: 0.5, key: '0.4-0.5' },
      { min: 0.5, max: 0.6, key: '0.5-0.6' },
      { min: 0.6, max: 0.7, key: '0.6-0.7' },
      { min: 0.7, max: 0.8, key: '0.7-0.8' },
      { min: 0.8, max: 0.9, key: '0.8-0.9' },
      { min: 0.9, max: 1.0, key: '0.9-1.0' },
    ];

    // Initialize all buckets with default values
    const buckets: ConfidenceCalibrationBuckets = {} as ConfidenceCalibrationBuckets;
    for (const range of bucketRanges) {
      buckets[range.key] = {
        count: 0,
        correct: 0,
        incorrect: 0,
        avgConfidence: 0,
      };
    }

    for (const range of bucketRanges) {
      const bucketData = data.filter((d) => {
        const conf = Number(d.confidence) || 0;
        return conf >= range.min && conf < range.max;
      });

      if (bucketData.length > 0) {
        const bucketAvgConfidence =
          bucketData.reduce((sum, d) => sum + (Number(d.confidence) || 0), 0) /
          bucketData.length;

        const bucketCorrect = bucketData.filter((d) => {
          const groundTruth = d.humanVerdict || d.verdict;
          return d.verdict === groundTruth;
        }).length;

        buckets[range.key] = {
          count: bucketData.length,
          correct: bucketCorrect,
          incorrect: bucketData.length - bucketCorrect,
          avgConfidence: bucketAvgConfidence,
        };
      }
    }

    snapshots.push({
      orgId,
      date: startDate,
      paradigmType,
      totalVerifications,
      escalatedCount,
      resolvedCount,
      falsePositives,
      truePositives,
      confidenceBuckets: buckets,
      totalCostCents,
      avgCostPerVerification,
      avgCostPerAccurate,
      avgConfidence,
      avgProcessingTimeMs,
    });
  }

  return snapshots;
}

/**
 * Save or update daily snapshots
 */
export async function saveDailySnapshots(
  snapshots: DailySnapshot[]
): Promise<void> {
  if (snapshots.length === 0) return;

  // Use upsert to handle existing snapshots
  for (const snapshot of snapshots) {
    await db
      .insert(analyticsDailySnapshotsTable)
      .values({
        orgId: snapshot.orgId,
        date: snapshot.date,
        paradigmType: snapshot.paradigmType as ParadigmType,
        totalVerifications: snapshot.totalVerifications,
        escalatedCount: snapshot.escalatedCount,
        resolvedCount: snapshot.resolvedCount,
        falsePositives: snapshot.falsePositives,
        truePositives: snapshot.truePositives,
        confidenceBuckets: snapshot.confidenceBuckets,
        totalCostCents: snapshot.totalCostCents,
        avgCostPerVerification: snapshot.avgCostPerVerification,
        avgCostPerAccurate: snapshot.avgCostPerAccurate,
        avgConfidence: snapshot.avgConfidence,
        avgProcessingTimeMs: snapshot.avgProcessingTimeMs,
      })
      .onConflictDoUpdate({
        target: [
          analyticsDailySnapshotsTable.orgId,
          analyticsDailySnapshotsTable.date,
          analyticsDailySnapshotsTable.paradigmType,
        ],
        set: {
          totalVerifications: snapshot.totalVerifications,
          escalatedCount: snapshot.escalatedCount,
          resolvedCount: snapshot.resolvedCount,
          falsePositives: snapshot.falsePositives,
          truePositives: snapshot.truePositives,
          confidenceBuckets: snapshot.confidenceBuckets,
          totalCostCents: snapshot.totalCostCents,
          avgCostPerVerification: snapshot.avgCostPerVerification,
          avgCostPerAccurate: snapshot.avgCostPerAccurate,
          avgConfidence: snapshot.avgConfidence,
          avgProcessingTimeMs: snapshot.avgProcessingTimeMs,
          updatedAt: new Date(),
        },
      });
  }
}

/**
 * Run daily aggregation for all organizations
 * Called by the cron job
 */
export async function runDailyAggregation(
  targetDate?: Date
): Promise<{ orgsProcessed: number; snapshotsCreated: number }> {
  // Default to yesterday
  const date = targetDate || subDays(new Date(), 1);
  const dateStr = format(date, 'yyyy-MM-dd');

  log.info({ date: dateStr }, 'Starting daily aggregation');

  // Get all organizations
  const orgs = await db
    .select({ id: organizationsTable.id })
    .from(organizationsTable);

  let snapshotsCreated = 0;

  for (const org of orgs) {
    try {
      const snapshots = await aggregateDayForOrg(org.id, date);

      if (snapshots.length > 0) {
        await saveDailySnapshots(snapshots);
        snapshotsCreated += snapshots.length;
        log.debug({ orgId: org.id, snapshots: snapshots.length }, 'Org aggregation complete');
      }
    } catch (error) {
      log.error({ err: error, orgId: org.id }, 'Error processing org');
    }
  }

  log.info({ orgsProcessed: orgs.length, snapshotsCreated }, 'Daily aggregation complete');

  return {
    orgsProcessed: orgs.length,
    snapshotsCreated,
  };
}

/**
 * Backfill aggregations for a date range
 */
export async function backfillAggregations(
  startDate: Date,
  endDate: Date
): Promise<{ daysProcessed: number; totalSnapshots: number }> {
  let currentDate = startOfDay(startDate);
  const end = startOfDay(endDate);
  let daysProcessed = 0;
  let totalSnapshots = 0;

  while (currentDate <= end) {
    const result = await runDailyAggregation(currentDate);
    totalSnapshots += result.snapshotsCreated;
    daysProcessed++;
    currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
  }

  return { daysProcessed, totalSnapshots };
}
