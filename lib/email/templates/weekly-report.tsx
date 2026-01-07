import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface WeeklyReportEmailProps {
  userName: string;
  organizationName: string;
  periodStart: string;
  periodEnd: string;
  stats: {
    totalVerifications: number;
    successRate: number;
    avgConfidence: number;
    escalationsCreated: number;
    escalationsResolved: number;
    topParadigm: string | null;
    totalCostCents: number;
  };
  highlights: string[];
  dashboardUrl: string;
}

export function WeeklyReportEmail({
  userName,
  organizationName,
  periodStart,
  periodEnd,
  stats,
  highlights,
  dashboardUrl,
}: WeeklyReportEmailProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCost = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <Html>
      <Head />
      <Preview>
        Weekly verification report for {organizationName} - {formatDate(periodStart)} to{' '}
        {formatDate(periodEnd)}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Weekly Verification Report</Heading>
          <Text style={text}>Hi {userName},</Text>
          <Text style={text}>
            Here&apos;s your weekly summary for <strong>{organizationName}</strong> from{' '}
            {formatDate(periodStart)} to {formatDate(periodEnd)}.
          </Text>

          {/* Key Metrics */}
          <Section style={metricsGrid}>
            <div style={metricBox}>
              <Text style={metricValue}>{stats.totalVerifications.toLocaleString()}</Text>
              <Text style={metricLabel}>Verifications</Text>
            </div>
            <div style={metricBox}>
              <Text style={metricValue}>{formatPercent(stats.successRate)}</Text>
              <Text style={metricLabel}>Success Rate</Text>
            </div>
            <div style={metricBox}>
              <Text style={metricValue}>{formatPercent(stats.avgConfidence)}</Text>
              <Text style={metricLabel}>Avg Confidence</Text>
            </div>
            <div style={metricBox}>
              <Text style={metricValue}>{formatCost(stats.totalCostCents)}</Text>
              <Text style={metricLabel}>Total Cost</Text>
            </div>
          </Section>

          {/* Escalations */}
          <Text style={sectionTitle}>Escalations</Text>
          <Section style={statsBox}>
            <div style={statRow}>
              <Text style={statLabel}>New escalations</Text>
              <Text style={statValue}>{stats.escalationsCreated}</Text>
            </div>
            <div style={statRow}>
              <Text style={statLabel}>Resolved</Text>
              <Text style={statValue}>{stats.escalationsResolved}</Text>
            </div>
            <div style={statRow}>
              <Text style={statLabel}>Top paradigm</Text>
              <Text style={statValue}>{stats.topParadigm || 'N/A'}</Text>
            </div>
          </Section>

          {/* Highlights */}
          {highlights.length > 0 && (
            <>
              <Text style={sectionTitle}>Highlights</Text>
              <Section style={highlightsBox}>
                {highlights.map((highlight, index) => (
                  <Text key={index} style={highlightItem}>
                    • {highlight}
                  </Text>
                ))}
              </Section>
            </>
          )}

          {/* CTA */}
          <Section style={buttonContainer}>
            <a href={`${dashboardUrl}/analytics`} style={button}>
              View Full Analytics
            </a>
          </Section>

          <Hr style={hr} />
          <Text style={footerText}>
            You received this because weekly reports are enabled for your account.
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

const metricsGrid = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '12px',
  margin: '16px 0',
};

const metricBox = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  flex: '1 1 45%',
  minWidth: '120px',
  textAlign: 'center' as const,
};

const metricValue = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '700',
  lineHeight: '32px',
  margin: '0',
};

const metricLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '500',
  lineHeight: '16px',
  margin: '4px 0 0',
  textTransform: 'uppercase' as const,
};

const statsBox = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  margin: '8px 0',
};

const statRow = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
};

const statLabel = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const statValue = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '600',
  lineHeight: '20px',
  margin: '0',
};

const highlightsBox = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: '8px',
  padding: '16px',
  margin: '8px 0',
};

const highlightItem = {
  color: '#166534',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
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

export default WeeklyReportEmail;
