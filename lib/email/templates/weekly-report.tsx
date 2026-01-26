/**
 * Weekly Report Email Template
 * Sent weekly with verification statistics
 */

import {
  Heading,
  Section,
  Text,
} from '@react-email/components';
import { BaseTemplate, NotificationFooter } from './base-template';
import { emailStyles } from '../styles';

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
    <BaseTemplate
      preview={`Weekly verification report for ${organizationName} - ${formatDate(periodStart)} to ${formatDate(periodEnd)}`}
      footer={
        <NotificationFooter
          dashboardUrl={dashboardUrl}
          reason="weekly reports are enabled for your account"
        />
      }
    >
      <Heading style={emailStyles.h1}>Weekly Verification Report</Heading>
      <Text style={emailStyles.text}>Hi {userName},</Text>
      <Text style={emailStyles.text}>
        Here&apos;s your weekly summary for <strong>{organizationName}</strong> from{' '}
        {formatDate(periodStart)} to {formatDate(periodEnd)}.
      </Text>

      {/* Key Metrics */}
      <Section style={emailStyles.metricsGrid}>
        <div style={emailStyles.metricBox}>
          <Text style={emailStyles.metricValue}>{stats.totalVerifications.toLocaleString()}</Text>
          <Text style={emailStyles.metricLabel}>Verifications</Text>
        </div>
        <div style={emailStyles.metricBox}>
          <Text style={emailStyles.metricValue}>{formatPercent(stats.successRate)}</Text>
          <Text style={emailStyles.metricLabel}>Success Rate</Text>
        </div>
        <div style={emailStyles.metricBox}>
          <Text style={emailStyles.metricValue}>{formatPercent(stats.avgConfidence)}</Text>
          <Text style={emailStyles.metricLabel}>Avg Confidence</Text>
        </div>
        <div style={emailStyles.metricBox}>
          <Text style={emailStyles.metricValue}>{formatCost(stats.totalCostCents)}</Text>
          <Text style={emailStyles.metricLabel}>Total Cost</Text>
        </div>
      </Section>

      {/* Escalations */}
      <Text style={emailStyles.sectionTitle}>Escalations</Text>
      <Section style={emailStyles.statsBox}>
        <div style={emailStyles.statRow}>
          <Text style={emailStyles.statLabel}>New escalations</Text>
          <Text style={emailStyles.statValue}>{stats.escalationsCreated}</Text>
        </div>
        <div style={emailStyles.statRow}>
          <Text style={emailStyles.statLabel}>Resolved</Text>
          <Text style={emailStyles.statValue}>{stats.escalationsResolved}</Text>
        </div>
        <div style={emailStyles.statRow}>
          <Text style={emailStyles.statLabel}>Top paradigm</Text>
          <Text style={emailStyles.statValue}>{stats.topParadigm || 'N/A'}</Text>
        </div>
      </Section>

      {/* Highlights */}
      {highlights.length > 0 && (
        <>
          <Text style={emailStyles.sectionTitle}>Highlights</Text>
          <Section style={emailStyles.highlightsBox}>
            {highlights.map((highlight) => (
              <Text key={highlight} style={emailStyles.highlightItem}>
                • {highlight}
              </Text>
            ))}
          </Section>
        </>
      )}

      {/* CTA */}
      <Section style={emailStyles.buttonContainer}>
        <a href={`${dashboardUrl}/analytics`} style={emailStyles.button}>
          View Full Analytics
        </a>
      </Section>
    </BaseTemplate>
  );
}

export default WeeklyReportEmail;
