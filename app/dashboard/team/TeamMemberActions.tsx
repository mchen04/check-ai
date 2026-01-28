'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Shield, User, Eye, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface TeamMemberActionsProps {
  userId: string;
  currentRole: string;
  memberName: string;
}

export function TeamMemberActions({ userId, currentRole, memberName }: TeamMemberActionsProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const updateRole = async (newRole: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/dashboard/team/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      router.refresh();
    } catch {
      // Role update errors are handled silently - UI state remains unchanged
    } finally {
      setIsUpdating(false);
    }
  };

  const removeMember = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/dashboard/team/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      router.refresh();
    } catch {
      // Remove member errors are handled silently - UI state remains unchanged
    } finally {
      setIsUpdating(false);
      setShowRemoveDialog(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isUpdating}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => updateRole('admin')}
            disabled={currentRole === 'admin'}
          >
            <Shield className="mr-2 h-4 w-4" />
            Make Admin
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => updateRole('member')}
            disabled={currentRole === 'member'}
          >
            <User className="mr-2 h-4 w-4" />
            Make Member
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => updateRole('viewer')}
            disabled={currentRole === 'viewer'}
          >
            <Eye className="mr-2 h-4 w-4" />
            Make Viewer
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setShowRemoveDialog(true)}
          >
            <UserMinus className="mr-2 h-4 w-4" />
            Remove from Team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberName} from the team? They will lose access
              to all organization resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
