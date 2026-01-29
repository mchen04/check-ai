'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 rounded-full bg-destructive/10 p-3">
          <AlertCircle aria-hidden="true" className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
        <p className="mb-6 max-w-md text-sm text-muted-foreground">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>
        {error.digest && (
          <p className="mb-4 font-mono text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-3">
          <Button onClick={reset} variant="default">
            <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <Home aria-hidden="true" className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
