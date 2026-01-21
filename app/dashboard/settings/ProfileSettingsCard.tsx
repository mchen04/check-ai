'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';
import { InlineError } from '@/components/ui/empty-state';
import { ButtonSpinner } from '@/components/ui/loading-spinner';

interface ProfileSettingsCardProps {
  initialName: string;
  email: string;
}

export function ProfileSettingsCard({ initialName, email }: ProfileSettingsCardProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasChanges = name !== initialName;

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/dashboard/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to update profile'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 shrink-0 text-muted-foreground" />
          <CardTitle className="text-sm">Profile</CardTitle>
        </div>
        <CardDescription className="text-xs">Your personal account settings</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              defaultValue={email}
              disabled
              className="bg-muted"
            />
          </div>
        </div>

        <InlineError message={error} />

        {success && (
          <div className="text-sm text-green-600">
            Profile updated successfully!
          </div>
        )}

        <Button onClick={handleSave} disabled={isLoading || !hasChanges}>
          {isLoading && <ButtonSpinner />}
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
}
