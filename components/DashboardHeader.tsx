import { Menu, Shield } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/server';
import DashboardHeaderProfileDropdown from './DashboardHeaderProfileDropdown';
import { Badge } from '@/components/ui/badge';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserOrgContext } from '@/lib/rbac/get-user-org';

async function UserPlanBadge() {
  const context = await getUserOrgContext();

  if (!context) {
    return null;
  }

  const { planType } = context.organization;
  const label = planType.charAt(0).toUpperCase() + planType.slice(1);
  const variant = planType === 'free' ? 'outline' : 'default';

  return (
    <Badge variant={variant} className="font-medium">
      {label}
    </Badge>
  );
}

export default async function DashboardHeader() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 md:px-6">
        {/* Logo */}
        <Link className="flex items-center gap-2" href="/dashboard">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="hidden text-lg font-semibold tracking-tight md:inline-block">
            Check
          </span>
        </Link>

        {/* Plan Badge */}
        <div className="ml-4">
          <Suspense
            fallback={
              <Badge variant="outline">
                <Skeleton className="h-4 w-12" />
              </Badge>
            }
          >
            <UserPlanBadge />
          </Suspense>
        </div>

        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="ml-auto mr-2 lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>

        {/* Right side - Profile */}
        <div className="ml-auto flex items-center gap-4">
          <DashboardHeaderProfileDropdown />
        </div>
      </div>
    </header>
  );
}
