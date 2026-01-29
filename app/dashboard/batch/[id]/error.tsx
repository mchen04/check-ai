'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function BatchDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error with proper dependency
    console.error('Batch detail error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 rounded-full bg-destructive/10 p-3">
          <AlertCircle aria-hidden="true" className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Failed to Load Batch</h2>
        <p className="mb-6 max-w-md text-sm text-muted-foreground">
          We couldn&apos;t load this batch job. It may not exist or you may not have permission to view it.
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
            <Link href="/dashboard/batch">
              <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
              Back to Batches
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
