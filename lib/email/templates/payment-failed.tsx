/**
 * Payment Failed Email Template
 * Sent when an invoice payment fails to notify org admins
 */

import {
  Button,
  Heading,
  Section,
  Text,
} from '@react-email/components';
import { emailStyles } from '../styles';
import { BaseTemplate, NotificationFooter } from './base-template';

interface PaymentFailedEmailProps {
  userName: string;
  organizationName: string;
  invoiceUrl: string | null;
  dashboardUrl: string;
}

export function PaymentFailedEmail({
  userName,
  organizationName,
  invoiceUrl,
  dashboardUrl,
}: PaymentFailedEmailProps) {
  return (
    <BaseTemplate
      preview={`Payment failed for ${organizationName} — please update your billing details`}
      footer={
        <NotificationFooter
          dashboardUrl={dashboardUrl}
          reason="you are an admin of this organization"
        />
      }
    >
      <Heading style={emailStyles.h1}>Payment Failed</Heading>
      <Text style={emailStyles.text}>Hi {userName},</Text>
      <Text style={emailStyles.text}>
        We were unable to process the latest payment for <strong>{organizationName}</strong>. Please
        update your payment method to avoid any interruption to your service.
      </Text>

      <Section style={emailStyles.buttonContainer}>
        <Button
          style={emailStyles.button}
          href={invoiceUrl ?? `${dashboardUrl}/settings/billing`}
        >
          Update Payment Method
        </Button>
      </Section>
    </BaseTemplate>
  );
}

export default PaymentFailedEmail;
