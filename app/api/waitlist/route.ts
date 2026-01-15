import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/utils/db/db';
import { waitlistTable } from '@/utils/db/schema';
import { checkPublicRateLimit } from '@/lib/cache/ratelimit';
import { createLogger } from '@/lib/logger';

const log = createLogger('Waitlist');

const WaitlistSchema = z.object({
  email: z.string().email('Invalid email address'),
  source: z.string().optional().default('landing'),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP (5 requests per hour)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
    const rateLimit = await checkPublicRateLimit(`waitlist:${ip}`, 5, 60 * 60 * 1000);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          },
        }
      );
    }

    const body = await req.json();
    const parsed = WaitlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email, source } = parsed.data;
    const referrer = req.headers.get('referer') || null;

    await db
      .insert(waitlistTable)
      .values({ email: email.toLowerCase(), source, referrer })
      .onConflictDoNothing({ target: waitlistTable.email });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, 'Waitlist signup error');
    return NextResponse.json(
      { error: 'Failed to join waitlist' },
      { status: 500 }
    );
  }
}
