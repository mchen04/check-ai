import type { Metadata } from 'next';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardSidebar from '@/components/DashboardSidebar';
import { BodyClassManager } from '@/components/BodyClassManager';

export const metadata: Metadata = {
  title: 'Dashboard | Check',
  description: 'Check Dashboard - Manage your verifications, API keys, and usage',
};

/**
 * Dashboard layout component.
 * Authentication is handled by middleware (utils/supabase/middleware.ts) which
 * redirects unauthenticated users to /login before this layout is rendered.
 * This eliminates the redundant getUser() call that was adding ~50-100ms latency.
 */
export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Disable landing page grid guides for dashboard */}
      <BodyClassManager className="no-grid-guides" />

      <div className="flex min-h-screen flex-col bg-background">
        <DashboardHeader />
        <div className="flex flex-1">
          <DashboardSidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </>
  );
}
