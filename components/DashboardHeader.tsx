import { Menu, Shield } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/server';
import DashboardHeaderProfileDropdown from './DashboardHeaderProfileDropdown';
import { Badge } from '@/components/ui/badge';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserOrgContext } from '@/lib/rbac';

async function UserPlanBadge() {
  const context = await getUserOrgContext();

  if (!context) {
    return null;
  }

  const { planType } = context.organization;
  const label = planType.charAt(0).toUpperCase() + planType.slice(1);
  const variant = planType === 'free' ? 'outline' : 'default';

  return (
    <Badge variant={variant} className="h-5 px-1.5 text-[10px] font-medium">
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
      <div className="flex h-12 items-center gap-3 px-3">
        {/* Logo */}
        <Link className="flex items-center gap-1.5" href="/dashboard">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
            <Shield className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="hidden text-sm font-semibold tracking-tight md:inline-block">
            Check
          </span>
        </Link>

        {/* Plan Badge */}
        <Suspense
          fallback={
            <Badge variant="outline" className="h-5 text-[10px] px-1.5">
              <Skeleton className="h-3 w-8" />
            </Badge>
          }
        >
          <UserPlanBadge />
        </Suspense>

        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 lg:hidden">
          <Menu className="h-4 w-4" />
          <span className="sr-only">Toggle Menu</span>
        </Button>

        {/* Right side - Profile */}
        <div className="ml-auto flex items-center gap-2">
          <DashboardHeaderProfileDropdown />
        </div>
      </div>
    </header>
  );
}
