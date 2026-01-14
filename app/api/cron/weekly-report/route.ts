/**
 * GET/POST /api/cron/weekly-report - Weekly report cron job
 *
 * This endpoint is called by Vercel Cron at 9 AM UTC every Monday to send
 * weekly digest emails to users who have weekly reports enabled.
 * Vercel Cron uses GET requests with Authorization: Bearer <CRON_SECRET> header.
 *
 * Security: Protected by CRON_SECRET environment variable
 *
 * @see https://vercel.com/docs/cron-jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendAllWeeklyReports } from '@/lib/email/send-weekly-report';

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
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // Vercel sends: Authorization: Bearer <CRON_SECRET>
  const providedSecret = authHeader?.replace('Bearer ', '');

  if (providedSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // Auth valid
}

/**
 * Runs the weekly report logic (shared between GET and POST)
 */
async function runWeeklyReports(_req: NextRequest): Promise<NextResponse> {
  try {
    console.log('[Cron] Starting weekly report generation');

    const result = await sendAllWeeklyReports();

    console.log(
      `[Cron] Weekly reports complete: ${result.orgsProcessed} orgs processed, ${result.totalSent} emails sent`
    );

    if (result.errors.length > 0) {
      console.warn('[Cron] Some errors occurred:', result.errors.slice(0, 10)); // Log first 10
    }

    return NextResponse.json({
      success: result.errors.length === 0,
      orgsProcessed: result.orgsProcessed,
      emailsSent: result.totalSent,
      errorCount: result.errors.length,
      errors: result.errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error) {
    console.error('[Cron] Weekly report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET handler - Vercel Cron uses GET requests
 * If authenticated: runs weekly reports
 * If not authenticated: returns API documentation (health check)
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  // No auth header = return documentation (health check endpoint)
  if (!authHeader) {
    return NextResponse.json({
      endpoint: '/api/cron/weekly-report',
      description: 'Weekly digest report cron job - sends weekly verification summaries to users',
      schedule: '9 AM UTC every Monday (0 9 * * 1)',
      methods: ['GET', 'POST'],
      authentication: 'Requires CRON_SECRET in Authorization: Bearer header',
      behavior: {
        userPreferences: 'Only sends to users with weeklyReport preference enabled (default: true)',
        orgFiltering: 'Only processes organizations with activity in the past week',
        contentIncludes: [
          'Total verifications',
          'Success rate',
          'Average confidence',
          'Escalation stats',
          'Top paradigm used',
          'Total cost',
          'Weekly highlights',
        ],
      },
      example: {
        vercelCron: 'GET /api/cron/weekly-report (automatic)',
        manual:
          'curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/weekly-report',
      },
    });
  }

  // Has auth header = validate and run weekly reports
  const authError = validateAuth(req);
  if (authError) return authError;

  return runWeeklyReports(req);
}

/**
 * POST handler - for backwards compatibility and manual triggers
 */
export async function POST(req: NextRequest) {
  const authError = validateAuth(req);
  if (authError) return authError;

  return runWeeklyReports(req);
}
