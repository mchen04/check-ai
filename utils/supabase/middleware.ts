import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth check needed
  const publicPaths = ['/login', '/auth', '/signup', '/forgot-password', '/demo', '/docs', '/invite', '/privacy', '/terms', '/webhook', '/api/'];
  if (publicPaths.some((p) => pathname.startsWith(p)) || pathname === '/') {
    // If on landing page, check cookie to redirect logged-in users to dashboard
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

  // Protected routes — check for Supabase auth cookie existence.
  // Actual JWT validation happens in server components/API routes,
  // NOT here, because Vercel Hobby plan has a 1.5s edge middleware
  // timeout and the Supabase JWKS fetch on cold start exceeds it.
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
