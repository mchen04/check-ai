'use client';

import { memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Book, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { docsNavigation, type NavItem } from '@/lib/docs/navigation';

// Memoized NavLink to prevent re-renders when parent changes (rerender-memo)
const NavLink = memo(function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href;

  if (!item.href) return null;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
        isActive
          ? 'bg-primary/10 font-medium text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {isActive && <ChevronRight className="h-3 w-3" />}
      <span className={cn(!isActive && 'ml-5')}>{item.title}</span>
    </Link>
  );
});

function NavSection({ item, pathname }: { item: NavItem; pathname: string }) {
  if (item.items) {
    return (
      <div className="mb-6">
        <h4 className="mb-2 px-2 text-sm font-semibold text-foreground">
          {item.title}
        </h4>
        <div className="space-y-1">
          {item.items.map((subItem) => (
            <NavLink key={subItem.href} item={subItem} pathname={pathname} />
          ))}
        </div>
      </div>
    );
  }

  return <NavLink item={item} pathname={pathname} />;
}

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border lg:block">
      <div className="sticky top-0 h-screen overflow-y-auto py-6">
        {/* Logo/Brand */}
        <div className="mb-8 px-4">
          <Link href="/" className="flex items-center gap-2">
            <Book className="h-5 w-5 text-primary" />
            <span className="font-semibold">Check Docs</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="px-2">
          {docsNavigation.map((section) => (
            <NavSection key={section.href || section.title} item={section} pathname={pathname} />
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-4 my-6 h-px bg-border" />

        {/* Quick links */}
        <div className="px-4">
          <Link
            href="/dashboard/playground"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <PlayCircle className="h-4 w-4" />
            API Playground
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </aside>
  );
}
