import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — skip Supabase client creation entirely.
  // This avoids the JWKS fetch on routes that don't need auth,
  // keeping cold starts fast for login/signup/docs/api/etc.
  const publicPaths = ['/login', '/auth', '/signup', '/forgot-password', '/demo', '/docs', '/invite', '/privacy', '/terms', '/webhook', '/api/'];
  if (publicPaths.some((p) => pathname.startsWith(p)) || pathname === '/') {
    if (pathname === '/') {
      const hasSession = request.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
      if (hasSession) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next({ request });
  }

  // Protected routes — create Supabase client for session refresh + cookie propagation
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims() validates JWT locally using cached JWKS keys (fast after first call)
  // and refreshes expired tokens automatically. This is what Supabase docs require.
  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && data?.claims?.sub;

  if (!isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // CRITICAL: Return supabaseResponse (not NextResponse.next()) to propagate
  // refreshed cookies to both downstream server components and the browser.
  return supabaseResponse;
}
