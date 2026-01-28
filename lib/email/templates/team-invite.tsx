/**
 * Team Invite Email Template
 * Sent when a user is invited to join an organization
 */

import {
  Button,
  Heading,
  Section,
  Text,
} from '@react-email/components';
import { emailStyles } from '../styles';
import { BaseTemplate, StandardFooter } from './base-template';

interface TeamInviteEmailProps {
  inviteUrl: string;
  organizationName: string;
  role: string;
  expiresInDays?: number;
}

export function TeamInviteEmail({
  inviteUrl,
  organizationName,
  role,
  expiresInDays = 7,
}: TeamInviteEmailProps) {
  return (
    <BaseTemplate
      preview={`You've been invited to join ${organizationName} on Check`}
      footer={
        <StandardFooter helpText="If you didn't expect this invitation, you can ignore this email." />
      }
    >
      <Heading style={emailStyles.h1}>Team Invitation</Heading>
      <Text style={emailStyles.text}>
        You&apos;ve been invited to join <strong>{organizationName}</strong> as a{' '}
        <strong>{role}</strong> on Check.
      </Text>
      <Section style={emailStyles.buttonContainer}>
        <Button style={emailStyles.button} href={inviteUrl}>
          Accept Invitation
        </Button>
      </Section>
      <Text style={emailStyles.footerText}>
        This invitation expires in {expiresInDays} days.
      </Text>
    </BaseTemplate>
  );
}

export default TeamInviteEmail;
