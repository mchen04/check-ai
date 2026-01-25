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
  Plug,
} from 'lucide-react';

// Organized by user workflow:
// 1. Core Actions - what users do daily (verifications, batches, testing)
// 2. Monitoring - checking status/metrics (usage, escalations)
// 3. Configuration - setup and management (keys, integrations, team)
// 4. Account - personal settings (least frequent)

const coreNavigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Verifications', href: '/dashboard/verify', icon: Shield },
  { name: 'Batch Jobs', href: '/dashboard/batch', icon: Layers },
  { name: 'Playground', href: '/dashboard/playground', icon: PlayCircle },
];

const monitoringNavigation = [
  { name: 'Usage', href: '/dashboard/usage', icon: BarChart3 },
  { name: 'Escalations', href: '/dashboard/escalations', icon: AlertCircle },
];

const configNavigation = [
  { name: 'API Keys', href: '/dashboard/keys', icon: Key },
  { name: 'Providers', href: '/dashboard/providers', icon: Plug },
  { name: 'Team', href: '/dashboard/team', icon: Users },
];

const accountNavigation = [{ name: 'Settings', href: '/dashboard/settings', icon: Settings }];

export default function DashboardSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    return (
      <Link
        key={item.name}
        href={item.href}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150',
          active
            ? 'bg-foreground/5 font-medium text-foreground'
            : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
        )}
      >
        <Icon className={cn('h-4 w-4', active && 'text-primary')} />
        {item.name}
      </Link>
    );
  };

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border/50 bg-background lg:block">
      <nav className="flex h-full flex-col gap-0.5 px-3 py-4">
        {/* Core Actions */}
        <div className="space-y-0.5">{coreNavigation.map(renderNavItem)}</div>

        <div className="my-4 h-px bg-border/50" />

        {/* Monitoring */}
        <div className="space-y-0.5">{monitoringNavigation.map(renderNavItem)}</div>

        <div className="my-4 h-px bg-border/50" />

        {/* Configuration */}
        <div className="space-y-0.5">{configNavigation.map(renderNavItem)}</div>

        <div className="my-4 h-px bg-border/50" />

        {/* Account */}
        <div className="space-y-0.5">{accountNavigation.map(renderNavItem)}</div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Help Link */}
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
          <p className="mb-1.5 text-sm font-medium">Need help?</p>
          <Link href="/docs" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            View Documentation →
          </Link>
        </div>
      </nav>
    </aside>
  );
}
