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
    <aside className="hidden w-64 shrink-0 border-r border-border bg-background lg:block">
      <nav className="flex h-full flex-col gap-2 p-4">
        {/* Main Navigation */}
        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-4 h-px bg-border" />

        {/* Secondary Navigation */}
        <div className="space-y-1">
          {secondaryNavigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Help Link */}
        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <p className="mb-2 text-sm font-medium">Need help?</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Check out our documentation or contact support.
          </p>
          <Link
            href="/docs"
            className="text-xs font-medium text-primary hover:underline"
          >
            View Documentation
          </Link>
        </div>
      </nav>
    </aside>
  );
}
