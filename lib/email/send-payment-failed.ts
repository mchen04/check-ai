import { eq, and, inArray } from 'drizzle-orm';
import { db } from '@/utils/db/db';
import { organizationsTable, orgMembersTable, usersTable } from '@/utils/db/schema';
import { createLogger } from '@/lib/logger';
import { sendEmail, isEmailConfigured } from './sender';
import { PaymentFailedEmail } from './templates/payment-failed';

const log = createLogger('Email');

const PUBLIC_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3001';

interface SendPaymentFailedParams {
  stripeCustomerId: string;
  invoiceUrl: string | null;
}

/**
 * Notify org admins when a payment fails.
 * Fire-and-forget — errors are logged but don't propagate.
 */
export async function sendPaymentFailedEmail({
  stripeCustomerId,
  invoiceUrl,
}: SendPaymentFailedParams): Promise<void> {
  if (!isEmailConfigured()) {
    log.warn('Resend not configured, skipping payment failure email');
    return;
  }

  try {
    // Look up org by Stripe customer ID
    const [org] = await db
      .select({ id: organizationsTable.id, name: organizationsTable.name })
      .from(organizationsTable)
      .where(eq(organizationsTable.stripeCustomerId, stripeCustomerId));

    if (!org) {
      log.warn({ stripeCustomerId }, 'No org found for Stripe customer, skipping payment failure email');
      return;
    }

    // Get admin/owner members of the org
    const admins = await db
      .select({
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(orgMembersTable)
      .innerJoin(usersTable, eq(usersTable.id, orgMembersTable.userId))
      .where(
        and(
          eq(orgMembersTable.orgId, org.id),
          inArray(orgMembersTable.role, ['owner', 'admin'])
        )
      );

    for (const admin of admins) {
      await sendEmail(
        {
          from: 'Check <billing@check.ai>',
          to: admin.userEmail,
          subject: `Payment failed for ${org.name}`,
          react: PaymentFailedEmail({
            userName: admin.userName || 'there',
            organizationName: org.name,
            invoiceUrl,
            dashboardUrl: PUBLIC_URL,
          }),
        },
        { type: 'payment-failed', recipient: admin.userEmail }
      );
    }
  } catch (err) {
    log.error({ err, stripeCustomerId }, 'Error sending payment failure emails');
  }
}
