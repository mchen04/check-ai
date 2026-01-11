import { sendEmail } from './sender';
import { TeamInviteEmail } from './templates/team-invite';

interface SendInviteEmailParams {
  to: string;
  inviteUrl: string;
  organizationName: string;
  role: string;
}

export async function sendInviteEmail({
  to,
  inviteUrl,
  organizationName,
  role,
}: SendInviteEmailParams): Promise<{ success: boolean; error?: string }> {
  return sendEmail(
    {
      from: 'Check <noreply@check.ai>',
      to,
      subject: `You've been invited to join ${organizationName}`,
      react: TeamInviteEmail({ inviteUrl, organizationName, role }),
    },
    { type: 'invite', recipient: to }
  );
}
