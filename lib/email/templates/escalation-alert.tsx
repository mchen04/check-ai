/**
 * Escalation Alert Email Template
 * Sent when a verification is escalated for human review
 */

import {
  Button,
  Heading,
  Section,
  Text,
} from '@react-email/components';
import { truncateString } from '@/lib/api';
import { emailStyles } from '../styles';
import { BaseTemplate, NotificationFooter } from './base-template';

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
    <BaseTemplate
      preview={`[${priorityLabel} Priority] Verification needs human review - ${organizationName}`}
      footer={
        <NotificationFooter
          dashboardUrl={dashboardUrl}
          reason="escalation alerts are enabled for your account"
        />
      }
    >
      <Heading style={emailStyles.h1}>Verification Escalated</Heading>
      <Text style={emailStyles.text}>Hi {userName},</Text>
      <Text style={emailStyles.text}>
        A verification in <strong>{organizationName}</strong> requires human review.
      </Text>

      <Section style={emailStyles.box}>
        <Text style={emailStyles.label}>Priority</Text>
        <Text style={{ ...emailStyles.value, color: priorityColor }}>{priorityLabel}</Text>

        <Text style={emailStyles.label}>Reason</Text>
        <Text style={emailStyles.value}>{reasonLabel}</Text>

        {deadline && (
          <>
            <Text style={emailStyles.label}>Review Deadline</Text>
            <Text style={emailStyles.value}>{deadline}</Text>
          </>
        )}
      </Section>

      <Text style={emailStyles.sectionTitle}>Content to Review</Text>
      <Section style={emailStyles.contentBox}>
        <Text style={emailStyles.contentText}>{truncateString(content, 300, true)}</Text>
      </Section>

      <Section style={emailStyles.buttonContainer}>
        <Button style={emailStyles.button} href={`${dashboardUrl}/escalations/${escalationId}`}>
          Review Escalation
        </Button>
      </Section>
    </BaseTemplate>
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

export default EscalationAlertEmail;
