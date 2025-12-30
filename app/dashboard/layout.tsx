import DashboardHeader from '@/components/DashboardHeader';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { db } from '@/utils/db/db';
import { usersTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SAAS Starter Kit',
  description: 'SAAS Starter Kit with Stripe, Supabase, Postgres',
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check if user has plan selected. If not redirect to subscibe
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // check user plan in db
  const checkUserInDB = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, user!.email!));
  if (checkUserInDB[0].plan === 'none') {
    return redirect('/subscribe');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      {children}
    </div>
  );
}
