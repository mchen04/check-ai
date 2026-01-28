import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardSidebar from '@/components/DashboardSidebar';
import { BodyClassManager } from '@/components/BodyClassManager';
import { createClient } from '@/utils/supabase/server';

export const metadata: Metadata = {
  title: 'Dashboard | Check',
  description: 'Check Dashboard - Manage your verifications, API keys, and usage',
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return redirect('/login');
  }

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
