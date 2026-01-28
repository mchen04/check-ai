import { Menu } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserOrgContext } from '@/lib/rbac';
import DashboardHeaderProfileDropdown from './DashboardHeaderProfileDropdown';

async function UserPlanBadge() {
  const context = await getUserOrgContext();

  if (!context) {
    return null;
  }

  const { planType } = context.organization;
  const label = planType.charAt(0).toUpperCase() + planType.slice(1);

  // Different styling per plan type
  if (planType === 'free') {
    return (
      <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
    );
  }

  return (
    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
      {label}
    </span>
  );
}

export default async function DashboardHeader() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md">
      <div className="flex h-14 items-center gap-4 px-5">
        {/* Logo */}
        <Link className="flex items-center gap-2.5 transition-opacity hover:opacity-80" href="/dashboard">
          <Image src="/logo.svg" alt="Check" width={24} height={24} />
          <span className="hidden text-sm font-semibold tracking-tight md:inline-block">
            Check
          </span>
        </Link>

        {/* Plan Badge */}
        <Suspense
          fallback={
            <span className="rounded-md border border-border bg-muted px-2 py-0.5">
              <Skeleton className="h-3 w-8" />
            </span>
          }
        >
          <UserPlanBadge />
        </Suspense>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" aria-label="Toggle Menu">
          <Menu aria-hidden="true" className="h-4 w-4" />
          <span className="sr-only">Toggle Menu</span>
        </Button>

        {/* Right side - Profile */}
        <div className="flex items-center">
          <DashboardHeaderProfileDropdown />
        </div>
      </div>
    </header>
  );
}
