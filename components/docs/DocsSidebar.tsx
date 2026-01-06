'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { docsNavigation, type NavItem } from '@/lib/docs/navigation';
import { ChevronRight, Book, PlayCircle } from 'lucide-react';

function NavSection({ item }: { item: NavItem }) {
  const pathname = usePathname();

  if (item.items) {
    return (
      <div className="mb-6">
        <h4 className="mb-2 px-2 text-sm font-semibold text-foreground">
          {item.title}
        </h4>
        <div className="space-y-1">
          {item.items.map((subItem) => (
            <NavLink key={subItem.href} item={subItem} />
          ))}
        </div>
      </div>
    );
  }

  return <NavLink item={item} />;
}

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
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
}

export function DocsSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border lg:block">
      <div className="sticky top-0 h-screen overflow-y-auto py-6">
        {/* Logo/Brand */}
        <div className="mb-8 px-4">
          <Link href="/" className="flex items-center gap-2">
            <Book className="h-5 w-5 text-primary" />
            <span className="font-semibold">Verifact Docs</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="px-2">
          {docsNavigation.map((section, i) => (
            <NavSection key={i} item={section} />
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
