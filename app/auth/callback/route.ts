import { NextResponse } from 'next/server';
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/utils/supabase/server';
import { createStripeCustomer } from '@/utils/stripe/api';
import { db } from '@/utils/db/db';
import { usersTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';
import { createDefaultOrganization } from '@/lib/org/create-org';

/**
 * Validate redirect URL to prevent open redirect attacks.
 * Only allows relative paths starting with / and no protocol/host.
 */
function isValidRedirectUrl(url: string): boolean {
  // Must start with /
  if (!url.startsWith('/')) return false;
  // No protocol (prevents javascript:, data:, etc.)
  if (url.includes(':')) return false;
  // No double slashes (prevents //evil.com)
  if (url.includes('//')) return false;
  // No backslashes (prevents \evil.com on some browsers)
  if (url.includes('\\')) return false;
  return true;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL (validated to prevent open redirect)
  const nextParam = searchParams.get('next') ?? '/';
  const next = isValidRedirectUrl(nextParam) ? nextParam : '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // check to see if user already exists in db
      const checkUserInDB = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, user!.email!));
      const isUserInDB = checkUserInDB.length > 0;
      const isNewUser = !isUserInDB;

      if (isNewUser) {
        // Create Stripe customer for billing (stored on organization)
        const stripeCustomerId = await createStripeCustomer(
          user!.id,
          user!.email!,
          user!.user_metadata.full_name
        );

        // Create user record in DB
        await db.insert(usersTable).values({
          id: user!.id,
          name: user!.user_metadata.full_name,
          email: user!.email!,
        });

        // Create default organization with Stripe customer ID for billing
        await createDefaultOrganization(
          user!.id,
          user!.user_metadata.full_name,
          user!.email!,
          stripeCustomerId
        );
      }

      // New users go to subscribe page (same as email signup), existing users go to next or dashboard
      const redirectPath = isNewUser ? '/subscribe' : (next === '/' ? '/dashboard' : next);

      const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${redirectPath}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`);
      } else {
        return NextResponse.redirect(`${origin}${redirectPath}`);
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
