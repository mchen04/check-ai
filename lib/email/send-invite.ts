import { resend } from './resend';
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
  if (!resend) {
    console.warn('Resend not configured, skipping email to:', to);
    return { success: true }; // Don't fail invite creation
  }

  try {
    const { error } = await resend.emails.send({
      from: 'VerifyAI <noreply@verifyai.dev>',
      to,
      subject: `You've been invited to join ${organizationName}`,
      react: TeamInviteEmail({ inviteUrl, organizationName, role }),
    });

    if (error) {
      console.error('Failed to send invite email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error sending invite email:', err);
    return { success: false, error: 'Failed to send email' };
  }
}
