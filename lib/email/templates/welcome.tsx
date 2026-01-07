import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface WelcomeEmailProps {
  userName: string;
  dashboardUrl: string;
  docsUrl: string;
}

export function WelcomeEmail({ userName, dashboardUrl, docsUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to VerifyAI - Let&apos;s get started!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to VerifyAI!</Heading>
          <Text style={text}>Hi {userName},</Text>
          <Text style={text}>
            Thanks for signing up! You&apos;re ready to start verifying AI-generated content and
            catching hallucinations before they reach production.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={dashboardUrl}>
              Go to Dashboard
            </Button>
          </Section>
          <Heading style={h2}>Quick Start Guide</Heading>
          <Text style={listItem}>
            <strong>1. Create an API Key</strong> — Generate your first API key in the dashboard
          </Text>
          <Text style={listItem}>
            <strong>2. Try the Playground</strong> — Test verification without writing code
          </Text>
          <Text style={listItem}>
            <strong>3. Integrate the API</strong> — Add verification to your app in minutes
          </Text>
          <Section style={buttonContainer}>
            <Button style={secondaryButton} href={docsUrl}>
              View Documentation
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footerText}>
            Questions? Just reply to this email — we&apos;re here to help.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '32px',
  margin: '0 0 24px',
};

const h2 = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '28px',
  margin: '32px 0 16px',
};

const text = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const listItem = {
  color: '#4b5563',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 12px',
  paddingLeft: '8px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '14px',
  display: 'inline-block',
};

const secondaryButton = {
  backgroundColor: '#ffffff',
  color: '#000000',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '14px',
  display: 'inline-block',
  border: '1px solid #e5e7eb',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const footerText = {
  color: '#9ca3af',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

export default WelcomeEmail;
