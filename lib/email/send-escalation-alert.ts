import { getMembersWithNotification } from '@/lib/db/queries/members';
import { createLogger } from '@/lib/logger';
import { sendEmail, isEmailConfigured, type BulkEmailResult } from './sender';
import { EscalationAlertEmail } from './templates/escalation-alert';

const log = createLogger('Email');

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
}: SendEscalationAlertParams): Promise<BulkEmailResult> {
  if (!isEmailConfigured()) {
    log.warn('Resend not configured, skipping escalation alerts');
    return { success: true, sent: 0, errors: [] };
  }

  const errors: string[] = [];
  let sent = 0;

  try {
    // Get members with escalation alerts enabled
    const members = await getMembersWithNotification(escalation.orgId, 'escalationAlerts');

    for (const member of members) {
      const result = await sendEmail(
        {
          from: 'Check <alerts@check.ai>',
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
        },
        { type: 'escalation-alert', recipient: member.userEmail }
      );

      if (result.success) {
        sent++;
      } else {
        errors.push(`Failed to send to ${member.userEmail}: ${result.error}`);
      }
    }

    return { success: errors.length === 0, sent, errors };
  } catch (err) {
    log.error({ err }, 'Error sending escalation alerts');
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
