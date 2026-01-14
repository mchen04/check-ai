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
import { runDailyAggregation, backfillAggregations } from '@/lib/analytics/aggregation-service';
import { subDays, parseISO, isValid } from 'date-fns';

// Vercel Cron config
export const maxDuration = 300; // 5 minutes max
export const dynamic = 'force-dynamic';

/**
 * Validates the CRON_SECRET and returns error response if invalid
 */
function validateAuth(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET not configured');
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      { status: 500 }
    );
  }

  // Vercel sends: Authorization: Bearer <CRON_SECRET>
  const providedSecret = authHeader?.replace('Bearer ', '');

  if (providedSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // Auth valid
}

/**
 * Runs the aggregation logic (shared between GET and POST)
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
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }

      const startDate = subDays(endDate, backfillDays - 1);

      console.log(
        `[Cron] Backfilling analytics from ${startDate.toISOString()} to ${endDate.toISOString()}`
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
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }
    }

    console.log(`[Cron] Running daily aggregation for ${targetDate?.toISOString() || 'yesterday'}`);
    const result = await runDailyAggregation(targetDate);

    return NextResponse.json({
      success: true,
      mode: 'daily',
      ...result,
    });
  } catch (error) {
    console.error('[Cron] Aggregation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET handler - Vercel Cron uses GET requests
 * If authenticated: runs aggregation
 * If not authenticated: returns API documentation (health check)
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  // No auth header = return documentation (health check endpoint)
  if (!authHeader) {
    return NextResponse.json({
      endpoint: '/api/cron/aggregate-analytics',
      description: 'Daily analytics aggregation cron job',
      schedule: '1 AM UTC daily (0 1 * * *)',
      methods: ['GET', 'POST'],
      parameters: {
        date: 'Optional. Target date in YYYY-MM-DD format. Defaults to yesterday.',
        backfill: 'Optional. Set to "true" to backfill multiple days.',
        days: 'Optional. Number of days to backfill. Defaults to 7.',
      },
      authentication: 'Requires CRON_SECRET in Authorization: Bearer header',
      example: {
        vercelCron: 'GET /api/cron/aggregate-analytics (automatic)',
        manual: 'curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/aggregate-analytics',
        backfill: 'curl -H "Authorization: Bearer $CRON_SECRET" "https://your-app.vercel.app/api/cron/aggregate-analytics?backfill=true&days=30"',
      },
    });
  }

  // Has auth header = validate and run aggregation
  const authError = validateAuth(req);
  if (authError) return authError;

  return runAggregation(req);
}

/**
 * POST handler - for backwards compatibility and manual triggers
 */
export async function POST(req: NextRequest) {
  const authError = validateAuth(req);
  if (authError) return authError;

  return runAggregation(req);
}
