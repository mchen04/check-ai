'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Shield,
  Key,
  BarChart3,
  PlayCircle,
  Settings,
  AlertCircle,
  Users,
  Layers,
} from 'lucide-react';

const navigation = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Verifications',
    href: '/dashboard/verify',
    icon: Shield,
  },
  {
    name: 'Batch Jobs',
    href: '/dashboard/batch',
    icon: Layers,
  },
  {
    name: 'API Keys',
    href: '/dashboard/keys',
    icon: Key,
  },
  {
    name: 'Usage',
    href: '/dashboard/usage',
    icon: BarChart3,
  },
  {
    name: 'Playground',
    href: '/dashboard/playground',
    icon: PlayCircle,
  },
];

const secondaryNavigation = [
  {
    name: 'Team',
    href: '/dashboard/team',
    icon: Users,
  },
  {
    name: 'Escalations',
    href: '/dashboard/escalations',
    icon: AlertCircle,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden w-48 shrink-0 border-r border-border bg-background lg:block">
      <nav className="flex h-full flex-col gap-1 px-2 py-3">
        {/* Main Navigation */}
        <div className="space-y-0.5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-2 h-px bg-border" />

        {/* Secondary Navigation */}
        <div className="space-y-0.5">
          {secondaryNavigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Help Link */}
        <div className="rounded-md border border-border bg-muted/50 p-2.5">
          <p className="mb-1 text-xs font-medium">Need help?</p>
          <Link
            href="/docs"
            className="text-[10px] text-muted-foreground hover:text-primary"
          >
            View Documentation →
          </Link>
        </div>
      </nav>
    </aside>
  );
}
