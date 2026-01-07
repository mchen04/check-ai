import { resend } from './resend';
import { EscalationAlertEmail } from './templates/escalation-alert';
import { db } from '@/utils/db/db';
import { userPreferencesTable, orgMembersTable, usersTable } from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';

interface EscalationDetails {
  id: string;
  orgId: string;
  reason: string;
  priority: number;
  content: string;
  deadline: Date | null;
}

interface SendEscalationAlertParams {
  escalation: EscalationDetails;
  organizationName: string;
  dashboardUrl: string;
}

export async function sendEscalationAlert({
  escalation,
  organizationName,
  dashboardUrl,
}: SendEscalationAlertParams): Promise<{ success: boolean; sent: number; errors: string[] }> {
  if (!resend) {
    console.warn('Resend not configured, skipping escalation alerts');
    return { success: true, sent: 0, errors: [] };
  }

  const errors: string[] = [];
  let sent = 0;

  try {
    // Get all org members with their user info and preferences
    const members = await db
      .select({
        userId: orgMembersTable.userId,
        role: orgMembersTable.role,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(orgMembersTable)
      .innerJoin(usersTable, eq(usersTable.id, orgMembersTable.userId))
      .where(eq(orgMembersTable.orgId, escalation.orgId));

    for (const member of members) {
      // Check if user has escalation alerts enabled
      const [prefs] = await db
        .select({ escalationAlerts: userPreferencesTable.escalationAlerts })
        .from(userPreferencesTable)
        .where(eq(userPreferencesTable.userId, member.userId));

      // Default to true if no preferences set
      const alertsEnabled = prefs?.escalationAlerts ?? true;

      if (!alertsEnabled) {
        continue;
      }

      try {
        const { error } = await resend.emails.send({
          from: 'VerifyAI <alerts@verifyai.dev>',
          to: member.userEmail,
          subject: `[${getPriorityLabel(escalation.priority)}] Verification needs review - ${organizationName}`,
          react: EscalationAlertEmail({
            userName: member.userName || 'there',
            organizationName,
            escalationId: escalation.id,
            reason: escalation.reason,
            priority: escalation.priority,
            content: escalation.content,
            deadline: escalation.deadline?.toISOString() || null,
            dashboardUrl,
          }),
        });

        if (error) {
          errors.push(`Failed to send to ${member.userEmail}: ${error.message}`);
        } else {
          sent++;
        }
      } catch (err) {
        errors.push(`Error sending to ${member.userEmail}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return { success: errors.length === 0, sent, errors };
  } catch (err) {
    console.error('Error sending escalation alerts:', err);
    return { success: false, sent: 0, errors: ['Failed to query organization members'] };
  }
}

function getPriorityLabel(priority: number): string {
  switch (priority) {
    case 1:
      return 'HIGH';
    case 2:
      return 'MEDIUM';
    default:
      return 'LOW';
  }
}
