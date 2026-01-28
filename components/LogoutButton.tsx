'use client';

import { useTransition } from 'react';
import { LogOut } from 'lucide-react';
import { logout } from '@/app/auth/actions';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        handleLogout();
      }}
      disabled={isPending}
      className="cursor-pointer text-destructive focus:text-destructive"
    >
      <LogOut className="mr-2 h-4 w-4" />
      <span>{isPending ? 'Logging out...' : 'Log out'}</span>
    </DropdownMenuItem>
  );
}
