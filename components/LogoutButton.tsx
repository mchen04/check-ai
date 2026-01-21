'use client';

import { useTransition } from 'react';
import { logout } from '@/app/auth/actions';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  return (
    <DropdownMenuItem
      onClick={handleLogout}
      disabled={isPending}
      className="cursor-pointer"
    >
      <LogOut className="mr-2 h-4 w-4" />
      <span>{isPending ? 'Logging out...' : 'Log out'}</span>
    </DropdownMenuItem>
  );
}
