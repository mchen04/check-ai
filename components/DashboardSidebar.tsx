'use client';

import { useCallback, memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  ExternalLink,
  ScrollText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Navigation config moved outside component to avoid recreation (rerender-memo-with-default-value)
const coreNavigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Verifications', href: '/dashboard/verify', icon: Shield },
  { name: 'Batch Jobs', href: '/dashboard/batch', icon: Layers },
  { name: 'Playground', href: '/dashboard/playground', icon: PlayCircle },
] as const;

const monitoringNavigation = [
  { name: 'Usage', href: '/dashboard/usage', icon: BarChart3 },
  { name: 'Logs', href: '/dashboard/logs', icon: ScrollText },
  { name: 'Escalations', href: '/dashboard/escalations', icon: AlertCircle },
] as const;

const configNavigation = [
  { name: 'API Keys', href: '/dashboard/keys', icon: Key },
  { name: 'Providers', href: '/dashboard/providers', icon: Plug },
  { name: 'Team', href: '/dashboard/team', icon: Users },
] as const;

const accountNavigation = [{ name: 'Settings', href: '/dashboard/settings', icon: Settings }] as const;

type NavItemType = {
  readonly name: string;
  readonly href: string;
  readonly icon: React.ComponentType<{ className?: string }>;
};

function NavSection({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {label && (
        <div className="px-3 py-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            {label}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

// Memoized NavItem component to prevent unnecessary re-renders (rerender-memo)
const NavItem = memo(function NavItem({
  item,
  isActive,
}: {
  item: NavItemType;
  isActive: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
        isActive
          ? 'bg-primary/10 font-medium text-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          'h-4 w-4 transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground/70 group-hover:text-muted-foreground'
        )}
      />
      {item.name}
    </Link>
  );
});

export default function DashboardSidebar() {
  const pathname = usePathname();

  // Memoize isActive check (rerender-functional-setstate pattern for callbacks)
  const checkIsActive = useCallback(
    (href: string) => {
      if (href === '/dashboard') {
        return pathname === '/dashboard';
      }
      return pathname.startsWith(href);
    },
    [pathname]
  );

  // Memoize render function with useCallback
  const renderNavItem = useCallback(
    (item: NavItemType) => (
      <NavItem key={item.name} item={item} isActive={checkIsActive(item.href)} />
    ),
    [checkIsActive]
  );

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border/40 bg-background lg:block">
      <nav className="flex h-full flex-col px-3 py-4">
        {/* Core Actions */}
        <NavSection>
          {coreNavigation.map(renderNavItem)}
        </NavSection>

        <div className="my-3 mx-3 h-px bg-border/50" />

        {/* Monitoring */}
        <NavSection label="Monitor">
          {monitoringNavigation.map(renderNavItem)}
        </NavSection>

        <div className="my-3 mx-3 h-px bg-border/50" />

        {/* Configuration */}
        <NavSection label="Configure">
          {configNavigation.map(renderNavItem)}
        </NavSection>

        <div className="my-3 mx-3 h-px bg-border/50" />

        {/* Account */}
        <NavSection>
          {accountNavigation.map(renderNavItem)}
        </NavSection>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Help Link */}
        <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
          <p className="mb-1 text-sm font-medium">Need help?</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Check out our docs for guides and API reference.
          </p>
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            View Docs
            <ExternalLink aria-hidden="true" className="h-3 w-3" />
          </Link>
        </div>
      </nav>
    </aside>
  );
}
