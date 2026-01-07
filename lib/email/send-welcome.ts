import { resend } from './resend';
import { WelcomeEmail } from './templates/welcome';

const PUBLIC_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3001';

interface SendWelcomeEmailParams {
  to: string;
  userName: string;
}

export async function sendWelcomeEmail({
  to,
  userName,
}: SendWelcomeEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('Resend not configured, skipping welcome email to:', to);
    return { success: true }; // Don't fail signup
  }

  try {
    const { error } = await resend.emails.send({
      from: 'VerifyAI <noreply@verifyai.dev>',
      to,
      subject: 'Welcome to VerifyAI!',
      react: WelcomeEmail({
        userName,
        dashboardUrl: `${PUBLIC_URL}/dashboard`,
        docsUrl: `${PUBLIC_URL}/docs`,
      }),
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error sending welcome email:', err);
    return { success: false, error: 'Failed to send email' };
  }
}
