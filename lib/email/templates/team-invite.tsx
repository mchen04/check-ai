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
    <Html>
      <Head />
      <Preview>You&apos;ve been invited to join {organizationName} on VerifyAI</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Team Invitation</Heading>
          <Text style={text}>
            You&apos;ve been invited to join <strong>{organizationName}</strong> as a{' '}
            <strong>{role}</strong> on VerifyAI.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={inviteUrl}>
              Accept Invitation
            </Button>
          </Section>
          <Text style={footerText}>
            This invitation expires in {expiresInDays} days.
          </Text>
          <Hr style={hr} />
          <Text style={footerText}>
            If you didn&apos;t expect this invitation, you can ignore this email.
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

const text = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px',
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

export default TeamInviteEmail;
