import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Use getClaims() for faster JWT validation in middleware.
  // getClaims() validates the JWT locally using cached JWKS keys, which is
  // significantly faster than getUser() which makes a network request.
  // This also automatically refreshes the session if the token is near expiration.
  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && data?.claims?.sub;
  const url = request.nextUrl.clone();

  // Skip auth redirect for webhook and API routes (they handle their own auth)
  if (
    request.nextUrl.pathname.startsWith('/webhook') ||
    request.nextUrl.pathname.startsWith('/api/')
  ) {
    return supabaseResponse;
  }

  if (
    !isAuthenticated &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/signup') &&
    !request.nextUrl.pathname.startsWith('/forgot-password') &&
    !request.nextUrl.pathname.startsWith('/docs') &&
    !request.nextUrl.pathname.startsWith('/invite') &&
    !request.nextUrl.pathname.startsWith('/privacy') &&
    !request.nextUrl.pathname.startsWith('/terms') &&
    !(request.nextUrl.pathname === '/')
  ) {
    // no user, redirect to login page
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If user is logged in, redirect from landing to dashboard
  if (isAuthenticated && request.nextUrl.pathname === '/') {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
