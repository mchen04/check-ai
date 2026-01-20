import { createClient } from '@/utils/supabase/server';
import { db } from '@/utils/db/db';
import { orgInvitesTable } from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, AlertCircle } from 'lucide-react';
import { AlertBanner } from '@/components/ui/alert-banner';
import Link from 'next/link';
import { AcceptInviteButton } from './AcceptInviteButton';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Check for valid invite
  const invite = await db.query.orgInvitesTable.findFirst({
    where: and(eq(orgInvitesTable.token, token), eq(orgInvitesTable.status, 'pending')),
    with: {
      organization: true,
    },
  });

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid, expired, or has already been used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check expiration
  if (new Date() > invite.expiresAt) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle>Invitation Expired</CardTitle>
            <CardDescription>
              This invitation has expired. Please ask the team admin to send a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Join {invite.organization.name}</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join as a <Badge variant="secondary">{invite.role}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              Invited: <strong>{invite.email}</strong>
            </p>
          </div>

          {user ? (
            user.email?.toLowerCase() === invite.email.toLowerCase() ? (
              <AcceptInviteButton token={token} />
            ) : (
              <div className="space-y-4">
                <AlertBanner variant="warning">
                  You&apos;re logged in as {user.email}, but this invite was sent to{' '}
                  {invite.email}. Please log out and sign in with the correct account.
                </AlertBanner>
                <form action="/auth/logout" method="post">
                  <Button variant="outline" type="submit" className="w-full">
                    Sign Out
                  </Button>
                </form>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please log in or create an account with <strong>{invite.email}</strong> to accept
                this invitation.
              </p>
              <Button asChild className="w-full">
                <Link href={`/login?redirect=/invite/${token}`}>Log In to Accept</Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link
                  href={`/signup?email=${encodeURIComponent(invite.email)}&redirect=/invite/${token}`}
                >
                  Create Account
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
