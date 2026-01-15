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
import { createCronHandlers, cronLog as log } from '@/lib/api/cron-middleware';

// Vercel Cron config
export const maxDuration = 300; // 5 minutes max
export const dynamic = 'force-dynamic';

/**
 * Runs the weekly report logic
 */
async function runWeeklyReports(_req: NextRequest): Promise<NextResponse> {
  try {
    log.info('Starting weekly report generation');

    const result = await sendAllWeeklyReports();

    log.info(
      { orgsProcessed: result.orgsProcessed, emailsSent: result.totalSent },
      'Weekly reports complete'
    );

    if (result.errors.length > 0) {
      log.warn({ errors: result.errors.slice(0, 10) }, 'Some errors occurred');
    }

    return NextResponse.json({
      success: result.errors.length === 0,
      orgsProcessed: result.orgsProcessed,
      emailsSent: result.totalSent,
      errorCount: result.errors.length,
      errors: result.errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error) {
    log.error({ err: error }, 'Weekly report error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const { GET, POST } = createCronHandlers(
  {
    endpoint: '/api/cron/weekly-report',
    description: 'Weekly digest report cron job - sends weekly verification summaries to users',
    schedule: '9 AM UTC every Monday (0 9 * * 1)',
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
      manual: 'curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/weekly-report',
    },
  },
  runWeeklyReports
);
