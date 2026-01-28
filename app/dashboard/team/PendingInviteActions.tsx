'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PendingInviteActionsProps {
  inviteId: string;
  email: string;
}

export function PendingInviteActions({ inviteId, email }: PendingInviteActionsProps) {
  const router = useRouter();
  const [isRevoking, setIsRevoking] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);

  const revokeInvite = async () => {
    setIsRevoking(true);
    try {
      const response = await fetch(`/api/dashboard/team/invites/${inviteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      router.refresh();
    } catch {
      // Revoke errors are handled silently - UI state remains unchanged
    } finally {
      setIsRevoking(false);
      setShowRevokeDialog(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowRevokeDialog(true)}
        disabled={isRevoking}
      >
        <X className="h-4 w-4" />
      </Button>

      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the invitation sent to {email}? They will no
              longer be able to join using this invite link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={revokeInvite}>Revoke Invite</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
