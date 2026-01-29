/**
 * Analytics Aggregation Service
 * Background job to pre-aggregate daily analytics metrics
 */

import { eq, and, gte, lt, sql, isNotNull } from 'drizzle-orm';
import { startOfDay } from 'date-fns/startOfDay';
import { subDays } from 'date-fns/subDays';
import { format } from 'date-fns/format';
import { db } from '@/utils/db/db';
import {
  verificationsTable,
  paradigmResultsTable,
  escalationsTable,
  analyticsDailySnapshotsTable,
  organizationsTable,
} from '@/utils/db/schema';
import { createLogger } from '@/lib/logger';
import type { ConfidenceCalibrationBuckets, ConfidenceCalibrationBucket, ParadigmType } from '@/utils/db/schema';

const log = createLogger('Analytics');

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

  // Group by paradigm - use direct push pattern for efficiency (js-index-maps)
  const paradigmMap = new Map<string, typeof results>();

  for (const r of results) {
    let existing = paradigmMap.get(r.paradigmType);
    if (!existing) {
      existing = [];
      paradigmMap.set(r.paradigmType, existing);
    }
    existing.push(r);
  }

  const snapshots: DailySnapshot[] = [];

  // Direct iteration over Map - no Array.from() needed (js-combine-iterations)
  for (const [paradigmType, data] of paradigmMap) {
    // Single-pass aggregation to compute all metrics efficiently
    let escalatedCount = 0;
    let resolvedCount = 0;
    let falsePositives = 0;
    let truePositives = 0;
    let totalCostCents = 0;
    let accurateCount = 0;
    let confidenceSum = 0;
    let confidenceCount = 0;
    let processingTimeSum = 0;
    let processingTimeCount = 0;

    for (const d of data) {
      // Escalation counts
      if (d.escalationId !== null) escalatedCount++;
      if (d.humanVerdict !== null) resolvedCount++;

      // FPR metrics
      if (d.verdict === 'true' && d.humanVerdict === 'false') falsePositives++;
      if (d.verdict === 'true' && d.humanVerdict === 'true') truePositives++;

      // Cost
      totalCostCents += Number(d.costCents) || 0;

      // Accuracy
      const groundTruth = d.humanVerdict || d.verdict;
      if (d.verdict === groundTruth) accurateCount++;

      // Confidence
      if (d.confidence !== null) {
        confidenceSum += Number(d.confidence) || 0;
        confidenceCount++;
      }

      // Processing time
      if (d.processingTimeMs !== null) {
        processingTimeSum += Number(d.processingTimeMs) || 0;
        processingTimeCount++;
      }
    }

    const totalVerifications = data.length;
    const avgCostPerVerification =
      totalVerifications > 0
        ? (totalCostCents / totalVerifications).toFixed(4)
        : null;
    const avgCostPerAccurate =
      accurateCount > 0 ? (totalCostCents / accurateCount).toFixed(4) : null;
    const avgConfidence =
      confidenceCount > 0 ? (confidenceSum / confidenceCount).toFixed(4) : null;
    const avgProcessingTimeMs =
      processingTimeCount > 0 ? Math.round(processingTimeSum / processingTimeCount) : null;

    // Confidence calibration buckets - matching schema format
    // Single-pass bucket calculation (O(N) instead of O(10N))
    const bucketKeys: (keyof ConfidenceCalibrationBuckets)[] = [
      '0.0-0.1', '0.1-0.2', '0.2-0.3', '0.3-0.4', '0.4-0.5',
      '0.5-0.6', '0.6-0.7', '0.7-0.8', '0.8-0.9', '0.9-1.0',
    ];

    // Initialize bucket accumulators
    const bucketStats: Record<string, { count: number; correct: number; confSum: number }> = {};
    for (const key of bucketKeys) {
      bucketStats[key] = { count: 0, correct: 0, confSum: 0 };
    }

    // Single pass through data to populate all buckets
    for (const d of data) {
      const conf = Number(d.confidence) || 0;
      // Determine bucket index (0-9) based on confidence
      const bucketIndex = Math.min(Math.floor(conf * 10), 9);
      const bucketKey = bucketKeys[bucketIndex];
      const bucket = bucketStats[bucketKey];

      bucket.count++;
      bucket.confSum += conf;

      // Check if verdict matches ground truth
      const groundTruth = d.humanVerdict || d.verdict;
      if (d.verdict === groundTruth) {
        bucket.correct++;
      }
    }

    // Build final buckets object
    const buckets: ConfidenceCalibrationBuckets = {} as ConfidenceCalibrationBuckets;
    for (const key of bucketKeys) {
      const stats = bucketStats[key];
      buckets[key] = {
        count: stats.count,
        correct: stats.correct,
        incorrect: stats.count - stats.correct,
        avgConfidence: stats.count > 0 ? stats.confSum / stats.count : 0,
      };
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

  // Use upsert to handle existing snapshots - process in parallel
  await Promise.all(
    snapshots.map((snapshot) =>
      db
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
        })
    )
  );
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

  // Process all orgs in parallel for better performance
  const results = await Promise.allSettled(
    orgs.map(async (org) => {
      const snapshots = await aggregateDayForOrg(org.id, date);
      if (snapshots.length > 0) {
        await saveDailySnapshots(snapshots);
        log.debug({ orgId: org.id, snapshots: snapshots.length }, 'Org aggregation complete');
        return snapshots.length;
      }
      return 0;
    })
  );

  // Count successful snapshots and log errors
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      snapshotsCreated += result.value;
    } else {
      log.error({ err: result.reason, orgId: orgs[i].id }, 'Error processing org');
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
