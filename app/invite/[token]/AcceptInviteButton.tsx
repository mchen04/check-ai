'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { InlineError } from '@/components/ui/empty-state';
import { getErrorMessage } from '@/lib/utils';

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard/team/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invite');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to accept invite'));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center py-4">
        <CheckCircle className="mb-2 h-8 w-8 text-success" />
        <p className="font-medium">Welcome to the team!</p>
        <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <InlineError message={error} />
      <Button onClick={handleAccept} disabled={isLoading} className="w-full">
        {isLoading && <ButtonSpinner />}
        {isLoading ? 'Accepting...' : 'Accept Invitation'}
      </Button>
    </div>
  );
}
