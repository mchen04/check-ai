import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getUserOrgContext } from '@/lib/rbac/get-user-org';
import { db } from '@/utils/db/db';
import { orgMembersTable, organizationsTable, userPreferencesTable } from '@/utils/db/schema';
import { eq, sql } from 'drizzle-orm';

// Client Components
import { ProfileSettingsCard } from './ProfileSettingsCard';
import { OrganizationSettingsCard } from './OrganizationSettingsCard';
import { NotificationSettingsCard } from './NotificationSettingsCard';
import { SecuritySettingsCard } from './SecuritySettingsCard';
import { WebhooksCard } from './WebhooksCard';
import { ProviderCredentialsCard } from './ProviderCredentialsCard';
import { ApiKeysCard } from './ApiKeysCard';
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

  // Get org context
  const orgContext = await getUserOrgContext();
  if (!orgContext) {
    redirect('/login');
  }

  // Get full organization settings
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

  // Get member count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orgMembersTable)
    .where(eq(orgMembersTable.orgId, orgContext.orgId));

  // Get user notification preferences
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
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-sm font-semibold">Settings</h1>
      </div>

      <div className="space-y-4">
        {/* Profile Settings */}
        <ProfileSettingsCard
          initialName={user.user_metadata?.full_name || ''}
          email={user.email || ''}
        />

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

        {/* Notification Settings */}
        <NotificationSettingsCard
          initialPreferences={
            preferences || {
              emailNotifications: true,
              weeklyReport: false,
              escalationAlerts: true,
            }
          }
        />

        {/* Security Settings */}
        <SecuritySettingsCard />

        {/* Webhooks */}
        <WebhooksCard orgId={orgContext.orgId} canEdit={canEdit} />

        {/* Provider Credentials */}
        <ProviderCredentialsCard canEdit={canEdit} />

        {/* API Keys */}
        <ApiKeysCard canEdit={canEdit} />

        {/* Data Retention */}
        <DataRetentionCard
          initialSettings={{
            dataRetentionEnabled: org.dataRetentionEnabled,
            verificationRetentionDays: org.verificationRetentionDays,
            batchRetentionDays: org.batchRetentionDays,
          }}
          canEdit={canEdit}
        />

        {/* Audit Logs - Only visible to owner/admin */}
        {canEdit && <AuditLogsCard />}

        {/* Danger Zone */}
        {orgContext.role === 'owner' && (
          <DangerZoneCard organizationName={org.name} />
        )}
      </div>
    </div>
  );
}
