import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/utils/db/db';
import { waitlistTable } from '@/utils/db/schema';
import { checkPublicRateLimit } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { errorResponse, successResponse, parseAndValidate } from '@/lib/api';

const log = createLogger('Waitlist');

const WaitlistSchema = z.object({
  email: z.email({ message: 'Invalid email address' }),
  source: z.string().optional().default('landing'),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP (5 requests per hour)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
    const rateLimit = await checkPublicRateLimit(`waitlist:${ip}`, 5, 60 * 60 * 1000);

    if (!rateLimit.success) {
      return errorResponse.tooManyRequests('Too many requests. Please try again later.', {
        retryAfter: rateLimit.retryAfter,
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
      });
    }

    const parsed = await parseAndValidate(req, WaitlistSchema);
    if (!parsed.success) return parsed.error;

    const { email, source } = parsed.data;
    const referrer = req.headers.get('referer') || null;

    await db
      .insert(waitlistTable)
      .values({ email: email.toLowerCase(), source, referrer })
      .onConflictDoNothing({ target: waitlistTable.email });

    return successResponse.ok();
  } catch (error) {
    log.error({ err: error }, 'Waitlist signup error');
    return errorResponse.internalError('Failed to join waitlist');
  }
}
