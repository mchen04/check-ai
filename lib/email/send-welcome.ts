import { sendEmail } from './sender';
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
  return sendEmail(
    {
      from: 'VerifyAI <noreply@verifyai.dev>',
      to,
      subject: 'Welcome to VerifyAI!',
      react: WelcomeEmail({
        userName,
        dashboardUrl: `${PUBLIC_URL}/dashboard`,
        docsUrl: `${PUBLIC_URL}/docs`,
      }),
    },
    { type: 'welcome', recipient: to }
  );
}
