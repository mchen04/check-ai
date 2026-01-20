/**
 * GET/POST /api/cron/aggregate-analytics - Daily analytics aggregation cron job
 *
 * This endpoint is called by Vercel Cron at 1 AM UTC daily to pre-aggregate analytics data.
 * Vercel Cron uses GET requests with Authorization: Bearer <CRON_SECRET> header.
 *
 * Security: Protected by CRON_SECRET environment variable
 *
 * @see https://vercel.com/docs/cron-jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { runDailyAggregation, backfillAggregations } from '@/lib/analytics';
import { subDays, parseISO, isValid } from 'date-fns';
import { createCronHandlers, cronLog as log, errorResponse } from '@/lib/api';

// Vercel Cron config
export const maxDuration = 300; // 5 minutes max
export const dynamic = 'force-dynamic';

/**
 * Runs the aggregation logic
 */
async function runAggregation(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse optional parameters
    const { searchParams } = new URL(req.url);
    const targetDateParam = searchParams.get('date');
    const backfillParam = searchParams.get('backfill');
    const backfillDays = parseInt(searchParams.get('days') || '7', 10);

    // Handle backfill mode
    if (backfillParam === 'true') {
      const endDate = targetDateParam
        ? parseISO(targetDateParam)
        : subDays(new Date(), 1);

      if (!isValid(endDate)) {
        return errorResponse.badRequest('Invalid date format. Use YYYY-MM-DD');
      }

      const startDate = subDays(endDate, backfillDays - 1);

      log.info(
        { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        'Backfilling analytics'
      );

      const result = await backfillAggregations(startDate, endDate);

      return NextResponse.json({
        success: true,
        mode: 'backfill',
        ...result,
      });
    }

    // Regular daily aggregation
    let targetDate: Date | undefined;

    if (targetDateParam) {
      targetDate = parseISO(targetDateParam);
      if (!isValid(targetDate)) {
        return errorResponse.badRequest('Invalid date format. Use YYYY-MM-DD');
      }
    }

    log.info(
      { targetDate: targetDate?.toISOString() || 'yesterday' },
      'Running daily aggregation'
    );
    const result = await runDailyAggregation(targetDate);

    return NextResponse.json({
      success: true,
      mode: 'daily',
      ...result,
    });
  } catch (error) {
    log.error({ err: error }, 'Aggregation error');
    return errorResponse.internalError();
  }
}

export const { GET, POST } = createCronHandlers(
  {
    endpoint: '/api/cron/aggregate-analytics',
    description: 'Daily analytics aggregation cron job',
    schedule: '1 AM UTC daily (0 1 * * *)',
    parameters: {
      date: 'Optional. Target date in YYYY-MM-DD format. Defaults to yesterday.',
      backfill: 'Optional. Set to "true" to backfill multiple days.',
      days: 'Optional. Number of days to backfill. Defaults to 7.',
    },
    example: {
      vercelCron: 'GET /api/cron/aggregate-analytics (automatic)',
      manual: 'curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/aggregate-analytics',
      backfill: 'curl -H "Authorization: Bearer $CRON_SECRET" "https://your-app.vercel.app/api/cron/aggregate-analytics?backfill=true&days=30"',
    },
  },
  runAggregation
);
