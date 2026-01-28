import Link from 'next/link';
import type { Metadata } from 'next';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Authentication Error | Check',
  description: 'There was an error with your authentication. Please try again or contact support.',
};

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto max-w-md space-y-6 px-4 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Authentication Error</h1>
        <p className="text-muted-foreground">
          There was an error verifying your authentication. This could happen if the link has
          expired or has already been used.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/login">Back to Login</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/signup">Create Account</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
