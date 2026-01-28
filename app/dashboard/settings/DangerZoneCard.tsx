'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { getErrorMessage } from '@/lib/utils';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { InlineError } from '@/components/ui/empty-state';

interface DangerZoneCardProps {
  organizationName: string;
}

const CONFIRMATION_PHRASE = 'delete my organization';

export function DangerZoneCard({ organizationName }: DangerZoneCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmation.toLowerCase() === CONFIRMATION_PHRASE;

  const handleDelete = async () => {
    if (!canDelete) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard/settings/organization/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: CONFIRMATION_PHRASE }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete organization');
      }

      // Redirect to login after deletion
      router.push('/login?deleted=true');
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to delete organization'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setConfirmation('');
    setError(null);
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Trash2 className="h-4 w-4 shrink-0 text-destructive" />
          <CardTitle className="text-sm text-destructive">Danger Zone</CardTitle>
        </div>
        <CardDescription className="text-xs">Irreversible actions that affect your organization</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm">Delete Organization</Label>
            <p className="text-xs text-muted-foreground">
              Permanently delete &quot;{organizationName}&quot;
            </p>
          </div>
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Organization
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                <AlertDialogDescription className="space-y-4">
                  <p>
                    This action is <strong>permanent and irreversible</strong>. All of the following will be deleted:
                  </p>
                  <ul className="ml-4 list-disc space-y-1 text-sm">
                    <li>All team members and their access</li>
                    <li>All API keys</li>
                    <li>All verification history</li>
                    <li>All webhooks and settings</li>
                    <li>All usage data and billing information</li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-2 py-4">
                <Label htmlFor="confirm-delete">
                  Type <code className="rounded bg-muted px-1">{CONFIRMATION_PHRASE}</code> to confirm
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder={CONFIRMATION_PHRASE}
                  className="font-mono"
                />
              </div>

              <InlineError message={error} />

              <AlertDialogFooter>
                <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={!canDelete || isLoading}
                >
                  {isLoading && <ButtonSpinner />}
                  {isLoading ? 'Deleting...' : 'Delete Organization'}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
