/**
 * Base Email Template
 * Provides consistent structure for all email templates
 */

import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Hr,
  Text,
} from '@react-email/components';
import { ReactNode } from 'react';
import { emailStyles } from '../styles';

interface BaseTemplateProps {
  /**
   * Preview text shown in email clients before opening
   */
  preview: string;
  /**
   * Main content of the email
   */
  children: ReactNode;
  /**
   * Optional footer content (defaults to standard footer)
   */
  footer?: ReactNode;
  /**
   * Whether to show the horizontal rule before footer
   */
  showFooterDivider?: boolean;
}

/**
 * BaseTemplate wraps all email templates with consistent structure:
 * - HTML document structure
 * - Preview text
 * - Centered container
 * - Optional footer
 */
export function BaseTemplate({
  preview,
  children,
  footer,
  showFooterDivider = true,
}: BaseTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={emailStyles.main}>
        <Container style={emailStyles.container}>
          {children}
          {showFooterDivider && <Hr style={emailStyles.hr} />}
          {footer}
        </Container>
      </Body>
    </Html>
  );
}

/**
 * Standard footer for transactional emails
 */
export function StandardFooter({ helpText }: { helpText?: string }) {
  return (
    <Text style={emailStyles.footerText}>
      {helpText || "Questions? Just reply to this email — we're here to help."}
    </Text>
  );
}

/**
 * Footer with notification settings link
 */
export function NotificationFooter({
  dashboardUrl,
  reason,
}: {
  dashboardUrl: string;
  reason: string;
}) {
  return (
    <>
      <Text style={emailStyles.footerText}>
        You received this because {reason}.
      </Text>
      <Text style={emailStyles.footerText}>
        Manage notification preferences in your{' '}
        <a href={`${dashboardUrl}/settings`} style={emailStyles.link}>
          dashboard settings
        </a>
        .
      </Text>
    </>
  );
}

export default BaseTemplate;
