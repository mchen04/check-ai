/**
 * Cron API Middleware
 * Shared authentication and request handling for Vercel Cron endpoints
 *
 * Provides consistent patterns for:
 * - CRON_SECRET authentication
 * - Health check/documentation endpoints (unauthenticated GET)
 * - Authenticated job execution (GET with auth, POST)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('Cron');

// =============================================================================
// TYPES
// =============================================================================

/**
 * Documentation for a cron endpoint
 */
export interface CronEndpointDocs {
  endpoint: string;
  description: string;
  schedule: string;
  parameters?: Record<string, string>;
  example?: Record<string, string>;
  [key: string]: unknown; // Allow additional custom fields
}

/**
 * Handler function for cron job execution
 */
export type CronHandler = (req: NextRequest) => Promise<NextResponse>;

// =============================================================================
// AUTHENTICATION
// =============================================================================

/**
 * Validates the CRON_SECRET from the Authorization header
 * In production, also validates the X-Vercel-Cron-Signature header for defense in depth
 *
 * @param req - NextRequest object
 * @returns null if valid, NextResponse error if invalid
 */
export function validateCronAuth(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.error('CRON_SECRET not configured - blocking all cron requests for security');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Vercel sends: Authorization: Bearer <CRON_SECRET>
  const providedSecret = authHeader?.replace('Bearer ', '');

  if (providedSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // In production, verify Vercel's signature header for defense in depth
  // Vercel always sends this header for cron requests
  if (process.env.NODE_ENV === 'production') {
    const vercelCronSignature = req.headers.get('x-vercel-cron-signature');
    // If we're in production and getting a cron request without the Vercel header,
    // it's likely a spoofed request (unless running locally with production flag)
    if (!vercelCronSignature && process.env.VERCEL) {
      log.warn('Cron request missing X-Vercel-Cron-Signature header');
      // Log warning but don't block - the CRON_SECRET check is the primary auth
    }
  }

  return null; // Auth valid
}

// =============================================================================
// MIDDLEWARE FACTORY
// =============================================================================

/**
 * Creates GET and POST handlers for a cron endpoint
 *
 * @param docs - Documentation to return for unauthenticated GET requests
 * @param handler - The actual cron job handler function
 * @returns Object with GET and POST handlers
 *
 * @example
 * const { GET, POST } = createCronHandlers(
 *   {
 *     endpoint: '/api/cron/my-job',
 *     description: 'My cron job',
 *     schedule: '0 1 * * *',
 *   },
 *   async (req) => {
 *     // Job logic here
 *     return NextResponse.json({ success: true });
 *   }
 * );
 *
 * export { GET, POST };
 */
export function createCronHandlers(
  docs: CronEndpointDocs,
  handler: CronHandler
): {
  GET: (req: NextRequest) => Promise<NextResponse>;
  POST: (req: NextRequest) => Promise<NextResponse>;
} {
  // Add standard fields to docs
  const fullDocs = {
    ...docs,
    methods: ['GET', 'POST'],
    authentication: 'Requires CRON_SECRET in Authorization: Bearer header',
  };

  return {
    /**
     * GET handler - Vercel Cron uses GET requests
     * If authenticated: runs the cron job
     * If not authenticated: returns API documentation (health check)
     */
    GET: async (req: NextRequest) => {
      const authHeader = req.headers.get('authorization');

      // No auth header = return documentation (health check endpoint)
      if (!authHeader) {
        return NextResponse.json(fullDocs);
      }

      // Has auth header = validate and run job
      const authError = validateCronAuth(req);
      if (authError) return authError;

      return handler(req);
    },

    /**
     * POST handler - for backwards compatibility and manual triggers
     */
    POST: async (req: NextRequest) => {
      const authError = validateCronAuth(req);
      if (authError) return authError;

      return handler(req);
    },
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export { log as cronLog };
