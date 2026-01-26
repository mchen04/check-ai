import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getUserOrgContext } from '@/lib/rbac';
import { db } from '@/utils/db/db';
import { organizationsTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';
import { generateStripeBillingPortalLink } from '@/utils/stripe/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, CreditCard, Settings, ExternalLink } from 'lucide-react';
import { ProfileSettingsCard } from '../settings/ProfileSettingsCard';

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/login');
  }

  const user = data.user;

  const orgContext = await getUserOrgContext();
  if (!orgContext) {
    redirect('/login');
  }

  const [org] = await db
    .select({
      id: organizationsTable.id,
      name: organizationsTable.name,
      planType: organizationsTable.planType,
    })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, orgContext.orgId))
    .limit(1);

  const billingPortalURL = await generateStripeBillingPortalLink(user.id);

  const roleDisplayName = {
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
    viewer: 'Viewer',
  }[orgContext.role] || orgContext.role;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal account information</p>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <ProfileSettingsCard
          initialName={user.user_metadata?.full_name || ''}
          email={user.email || ''}
        />

        {/* Organization Membership */}
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <CardTitle className="text-sm">Organization</CardTitle>
            </div>
            <CardDescription className="text-xs">Your organization membership</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium">{org.name}</span>
                <Badge variant="outline">{roleDisplayName}</Badge>
              </div>
              <Badge variant={org.planType === 'free' ? 'outline' : 'default'}>
                {org.planType.charAt(0).toUpperCase() + org.planType.slice(1)} Plan
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href={billingPortalURL}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manage Billing
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  All Settings
                </Link>
              </Button>
              {org.planType === 'free' && (
                <Button variant="default" size="sm" asChild>
                  <Link href="/subscribe">
                    Upgrade Plan
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
