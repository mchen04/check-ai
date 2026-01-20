/**
 * GET/POST /api/cron/cleanup-batches - Daily batch cleanup cron job
 *
 * This endpoint is called by Vercel Cron at 2 AM UTC daily to delete expired batch jobs.
 * Vercel Cron uses GET requests with Authorization: Bearer <CRON_SECRET> header.
 *
 * Security: Protected by CRON_SECRET environment variable
 *
 * @see https://vercel.com/docs/cron-jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  cleanupExpiredBatches,
  cleanupExpiredVerifications,
  getFullCleanupStats,
} from '@/lib/batch';
import { createCronHandlers, cronLog as log, errorResponse } from '@/lib/api';

// Vercel Cron config
export const maxDuration = 300; // 5 minutes max
export const dynamic = 'force-dynamic';

/**
 * Runs the cleanup logic
 */
async function runCleanup(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse optional parameters
    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get('dryRun') === 'true';
    const limit = parseInt(searchParams.get('limit') || '1000', 10);
    const statsOnly = searchParams.get('stats') === 'true';

    // If stats only, return cleanup statistics
    if (statsOnly) {
      const stats = await getFullCleanupStats();
      return NextResponse.json({
        success: true,
        mode: 'stats',
        ...stats,
      });
    }

    log.info(
      { limit, dryRun },
      `Running data cleanup (limit: ${limit}, dryRun: ${dryRun})`
    );

    // Run both batch and verification cleanup
    const [batchResult, verificationResult] = await Promise.all([
      cleanupExpiredBatches({ limit, dryRun }),
      cleanupExpiredVerifications({ limit, dryRun }),
    ]);

    return NextResponse.json({
      success: true,
      mode: dryRun ? 'dry-run' : 'cleanup',
      batches: batchResult,
      verifications: verificationResult,
    });
  } catch (error) {
    log.error({ err: error }, 'Cleanup error');
    return errorResponse.internalError();
  }
}

export const { GET, POST } = createCronHandlers(
  {
    endpoint: '/api/cron/cleanup-batches',
    description: 'Daily batch cleanup cron job - deletes expired batch jobs',
    schedule: '2 AM UTC daily (0 2 * * *)',
    parameters: {
      dryRun: 'Optional. Set to "true" to see what would be deleted without deleting.',
      limit: 'Optional. Maximum batches to delete per run. Defaults to 1000.',
      stats: 'Optional. Set to "true" to get cleanup statistics without running cleanup.',
    },
    example: {
      vercelCron: 'GET /api/cron/cleanup-batches (automatic)',
      manual: 'curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/cleanup-batches',
      dryRun: 'curl -H "Authorization: Bearer $CRON_SECRET" "https://your-app.vercel.app/api/cron/cleanup-batches?dryRun=true"',
      stats: 'curl -H "Authorization: Bearer $CRON_SECRET" "https://your-app.vercel.app/api/cron/cleanup-batches?stats=true"',
    },
    retention: {
      description: 'Batches and verifications are automatically deleted based on organization retention settings (default: 30 days)',
      configurable: true,
      minimumDays: 7,
    },
  },
  runCleanup
);
