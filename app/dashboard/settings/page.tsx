import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getUserOrgContext } from '@/lib/rbac/get-user-org';
import { db } from '@/utils/db/db';
import { orgMembersTable, organizationsTable, userPreferencesTable } from '@/utils/db/schema';
import { eq, sql } from 'drizzle-orm';

import { ProfileSettingsCard } from './ProfileSettingsCard';
import { OrganizationSettingsCard } from './OrganizationSettingsCard';
import { NotificationSettingsCard } from './NotificationSettingsCard';
import { SecuritySettingsCard } from './SecuritySettingsCard';
import { AppearanceSettingsCard } from './AppearanceSettingsCard';
import { DataRetentionCard } from './DataRetentionCard';
import { AuditLogsCard } from './AuditLogsCard';
import { DangerZoneCard } from './DangerZoneCard';

export default async function SettingsPage() {
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
      slug: organizationsTable.slug,
      planType: organizationsTable.planType,
      defaultVerificationMethod: organizationsTable.defaultVerificationMethod,
      autoEscalateThreshold: organizationsTable.autoEscalateThreshold,
      cacheEnabled: organizationsTable.cacheEnabled,
      storeVerificationContent: organizationsTable.storeVerificationContent,
      verificationRetentionDays: organizationsTable.verificationRetentionDays,
      batchRetentionDays: organizationsTable.batchRetentionDays,
      dataRetentionEnabled: organizationsTable.dataRetentionEnabled,
    })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, orgContext.orgId))
    .limit(1);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orgMembersTable)
    .where(eq(orgMembersTable.orgId, orgContext.orgId));

  const [preferences] = await db
    .select({
      emailNotifications: userPreferencesTable.emailNotifications,
      weeklyReport: userPreferencesTable.weeklyReport,
      escalationAlerts: userPreferencesTable.escalationAlerts,
    })
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, orgContext.userId))
    .limit(1);

  const canEdit = orgContext.role === 'owner' || orgContext.role === 'admin';

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-sm font-semibold">Settings</h1>
        <p className="text-xs text-muted-foreground">Manage your account and workspace settings</p>
      </div>

      <div className="space-y-4">
        {/* Account Settings */}
        <ProfileSettingsCard
          initialName={user.user_metadata?.full_name || ''}
          email={user.email || ''}
        />

        <SecuritySettingsCard />

        <NotificationSettingsCard
          initialPreferences={
            preferences || {
              emailNotifications: true,
              weeklyReport: false,
              escalationAlerts: true,
            }
          }
        />

        <AppearanceSettingsCard />

        {/* Organization Settings */}
        <OrganizationSettingsCard
          organization={{
            name: org.name,
            slug: org.slug,
            planType: org.planType,
            defaultVerificationMethod: org.defaultVerificationMethod,
            autoEscalateThreshold: parseFloat(org.autoEscalateThreshold || '0.50'),
            cacheEnabled: org.cacheEnabled,
            storeVerificationContent: org.storeVerificationContent,
          }}
          memberCount={Number(count)}
          canEdit={canEdit}
        />

        {/* Data & Privacy - Admin only */}
        {canEdit && (
          <>
            <DataRetentionCard
              initialSettings={{
                dataRetentionEnabled: org.dataRetentionEnabled,
                verificationRetentionDays: org.verificationRetentionDays,
                batchRetentionDays: org.batchRetentionDays,
              }}
              canEdit={canEdit}
            />
            <AuditLogsCard />
          </>
        )}

        {/* Danger Zone - Owner only */}
        {orgContext.role === 'owner' && <DangerZoneCard organizationName={org.name} />}
      </div>
    </div>
  );
}
