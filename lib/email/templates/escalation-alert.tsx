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

interface EscalationAlertEmailProps {
  userName: string;
  organizationName: string;
  escalationId: string;
  reason: string;
  priority: number;
  content: string;
  deadline: string | null;
  dashboardUrl: string;
}

export function EscalationAlertEmail({
  userName,
  organizationName,
  escalationId,
  reason,
  priority,
  content,
  deadline,
  dashboardUrl,
}: EscalationAlertEmailProps) {
  const priorityLabel = priority === 1 ? 'High' : priority === 2 ? 'Medium' : 'Low';
  const priorityColor = priority === 1 ? '#dc2626' : priority === 2 ? '#f59e0b' : '#6b7280';
  const reasonLabel = formatReason(reason);

  return (
    <Html>
      <Head />
      <Preview>
        [{priorityLabel} Priority] Verification needs human review - {organizationName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Verification Escalated</Heading>
          <Text style={text}>Hi {userName},</Text>
          <Text style={text}>
            A verification in <strong>{organizationName}</strong> requires human review.
          </Text>

          <Section style={alertBox}>
            <Text style={alertLabel}>Priority</Text>
            <Text style={{ ...alertValue, color: priorityColor }}>{priorityLabel}</Text>

            <Text style={alertLabel}>Reason</Text>
            <Text style={alertValue}>{reasonLabel}</Text>

            {deadline && (
              <>
                <Text style={alertLabel}>Review Deadline</Text>
                <Text style={alertValue}>{deadline}</Text>
              </>
            )}
          </Section>

          <Text style={sectionTitle}>Content to Review</Text>
          <Section style={contentBox}>
            <Text style={contentText}>{truncateContent(content, 300)}</Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={`${dashboardUrl}/escalations/${escalationId}`}>
              Review Escalation
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footerText}>
            You received this because escalation alerts are enabled for your account.
          </Text>
          <Text style={footerText}>
            Manage notification preferences in your{' '}
            <a href={`${dashboardUrl}/settings`} style={link}>
              dashboard settings
            </a>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

function formatReason(reason: string): string {
  const reasonMap: Record<string, string> = {
    low_confidence: 'Low confidence score',
    conflicting_results: 'Conflicting verification results',
    model_failure: 'Model processing failure',
    timeout: 'Verification timeout',
    manual_review_requested: 'Manual review requested',
  };
  return reasonMap[reason] || reason;
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '...';
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
  margin: '0 0 16px',
};

const sectionTitle = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '600',
  lineHeight: '20px',
  margin: '24px 0 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const alertBox = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '16px 0',
};

const alertLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '500',
  lineHeight: '16px',
  margin: '0 0 4px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const alertValue = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const contentBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  margin: '8px 0',
};

const contentText = {
  color: '#4b5563',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
  fontFamily: 'monospace',
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
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
  margin: '0 0 8px',
};

const link = {
  color: '#6b7280',
  textDecoration: 'underline',
};

export default EscalationAlertEmail;
