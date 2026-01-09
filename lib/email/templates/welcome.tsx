/**
 * Welcome Email Template
 * Sent to new users after sign up
 */

import {
  Button,
  Heading,
  Section,
  Text,
} from '@react-email/components';
import { BaseTemplate, StandardFooter } from './base-template';
import { emailStyles } from '../styles';

interface WelcomeEmailProps {
  userName: string;
  dashboardUrl: string;
  docsUrl: string;
}

export function WelcomeEmail({ userName, dashboardUrl, docsUrl }: WelcomeEmailProps) {
  return (
    <BaseTemplate
      preview="Welcome to Shove - Let's get started!"
      footer={<StandardFooter />}
    >
      <Heading style={emailStyles.h1}>Welcome to Shove!</Heading>
      <Text style={emailStyles.text}>Hi {userName},</Text>
      <Text style={emailStyles.text}>
        Thanks for signing up! You&apos;re ready to start verifying AI-generated content and
        catching hallucinations before they reach production.
      </Text>
      <Section style={emailStyles.buttonContainer}>
        <Button style={emailStyles.button} href={dashboardUrl}>
          Go to Dashboard
        </Button>
      </Section>
      <Heading style={emailStyles.h2}>Quick Start Guide</Heading>
      <Text style={emailStyles.listItem}>
        <strong>1. Create an API Key</strong> — Generate your first API key in the dashboard
      </Text>
      <Text style={emailStyles.listItem}>
        <strong>2. Try the Playground</strong> — Test verification without writing code
      </Text>
      <Text style={emailStyles.listItem}>
        <strong>3. Integrate the API</strong> — Add verification to your app in minutes
      </Text>
      <Section style={emailStyles.buttonContainer}>
        <Button style={emailStyles.secondaryButton} href={docsUrl}>
          View Documentation
        </Button>
      </Section>
    </BaseTemplate>
  );
}

export default WelcomeEmail;
