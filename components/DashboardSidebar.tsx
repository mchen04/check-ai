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
          'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon className="h-4 w-4" />
        {item.name}
      </Link>
    );
  };

  return (
    <aside className="hidden w-52 shrink-0 border-r border-border bg-background lg:block">
      <nav className="flex h-full flex-col gap-1 px-3 py-4">
        {/* Core Actions */}
        <div className="space-y-1">{coreNavigation.map(renderNavItem)}</div>

        <div className="my-3 h-px bg-border" />

        {/* Monitoring */}
        <div className="space-y-1">{monitoringNavigation.map(renderNavItem)}</div>

        <div className="my-3 h-px bg-border" />

        {/* Configuration */}
        <div className="space-y-1">{configNavigation.map(renderNavItem)}</div>

        <div className="my-3 h-px bg-border" />

        {/* Account */}
        <div className="space-y-1">{accountNavigation.map(renderNavItem)}</div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Help Link */}
        <div className="rounded-md border border-border bg-muted/50 p-3">
          <p className="mb-1 text-sm font-medium">Need help?</p>
          <Link href="/docs" className="text-xs text-muted-foreground hover:text-primary">
            View Documentation →
          </Link>
        </div>
      </nav>
    </aside>
  );
}
