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
  getCleanupStats,
} from '@/lib/batch/cleanup-service';

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
  // Also support x-cron-secret header for backwards compatibility
  const providedSecret =
    authHeader?.replace('Bearer ', '') || req.headers.get('x-cron-secret');

  if (providedSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // Auth valid
}

/**
 * Runs the cleanup logic (shared between GET and POST)
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
      const stats = await getCleanupStats();
      return NextResponse.json({
        success: true,
        mode: 'stats',
        ...stats,
      });
    }

    console.log(
      `[Cron] Running batch cleanup (limit: ${limit}, dryRun: ${dryRun})`
    );

    const result = await cleanupExpiredBatches({
      limit,
      dryRun,
    });

    return NextResponse.json({
      success: true,
      mode: dryRun ? 'dry-run' : 'cleanup',
      ...result,
    });
  } catch (error) {
    console.error('[Cron] Cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET handler - Vercel Cron uses GET requests
 * If authenticated: runs cleanup
 * If not authenticated: returns API documentation (health check)
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  // No auth header = return documentation (health check endpoint)
  if (!authHeader && !req.headers.get('x-cron-secret')) {
    return NextResponse.json({
      endpoint: '/api/cron/cleanup-batches',
      description: 'Daily batch cleanup cron job - deletes expired batch jobs',
      schedule: '2 AM UTC daily (0 2 * * *)',
      methods: ['GET', 'POST'],
      parameters: {
        dryRun:
          'Optional. Set to "true" to see what would be deleted without deleting.',
        limit:
          'Optional. Maximum batches to delete per run. Defaults to 1000.',
        stats:
          'Optional. Set to "true" to get cleanup statistics without running cleanup.',
      },
      authentication: 'Requires CRON_SECRET in Authorization: Bearer header',
      example: {
        vercelCron: 'GET /api/cron/cleanup-batches (automatic)',
        manual:
          'curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/cleanup-batches',
        dryRun:
          'curl -H "Authorization: Bearer $CRON_SECRET" "https://your-app.vercel.app/api/cron/cleanup-batches?dryRun=true"',
        stats:
          'curl -H "Authorization: Bearer $CRON_SECRET" "https://your-app.vercel.app/api/cron/cleanup-batches?stats=true"',
      },
      retention: {
        batchResultsRetentionDays: 30,
        description:
          'Batch jobs and their results are automatically deleted 30 days after creation',
      },
    });
  }

  // Has auth header = validate and run cleanup
  const authError = validateAuth(req);
  if (authError) return authError;

  return runCleanup(req);
}

/**
 * POST handler - for backwards compatibility and manual triggers
 */
export async function POST(req: NextRequest) {
  const authError = validateAuth(req);
  if (authError) return authError;

  return runCleanup(req);
}
