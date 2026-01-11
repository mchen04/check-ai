/**
 * Email Template Registry
 * Centralized registry for all email templates and their subjects
 */

import { WelcomeEmail } from './templates/welcome';
import { TeamInviteEmail } from './templates/team-invite';
import { EscalationAlertEmail } from './templates/escalation-alert';
import { WeeklyReportEmail } from './templates/weekly-report';

// =============================================================================
// Template Types
// =============================================================================

export type EmailTemplateType =
  | 'welcome'
  | 'team-invite'
  | 'escalation-alert'
  | 'weekly-report';

// =============================================================================
// Template Components Registry
// =============================================================================

export const emailTemplates = {
  'welcome': WelcomeEmail,
  'team-invite': TeamInviteEmail,
  'escalation-alert': EscalationAlertEmail,
  'weekly-report': WeeklyReportEmail,
} as const;

// =============================================================================
// Default Subject Lines
// =============================================================================

export const emailSubjects: Record<EmailTemplateType, string> = {
  'welcome': 'Welcome to Check!',
  'team-invite': "You've been invited to join {organizationName} on Check",
  'escalation-alert': '[{priority}] Verification needs human review - {organizationName}',
  'weekly-report': 'Weekly Verification Report - {organizationName}',
};

// =============================================================================
// Subject Line Helpers
// =============================================================================

type SubjectParams = Record<string, string>;

/**
 * Generate subject line from template with variable substitution
 */
export function getSubject(
  templateType: EmailTemplateType,
  params?: SubjectParams
): string {
  let subject = emailSubjects[templateType];

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      subject = subject.replace(`{${key}}`, value);
    }
  }

  return subject;
}

/**
 * Get priority label for escalation emails
 */
export function getPriorityLabel(priority: number): string {
  switch (priority) {
    case 1:
      return 'High Priority';
    case 2:
      return 'Medium Priority';
    case 3:
      return 'Low Priority';
    default:
      return 'Priority';
  }
}

// =============================================================================
// Template Props Types (for type safety)
// =============================================================================

export interface WelcomeEmailProps {
  userName: string;
  dashboardUrl: string;
  docsUrl: string;
}

export interface TeamInviteEmailProps {
  inviteUrl: string;
  organizationName: string;
  role: string;
  expiresInDays?: number;
}

export interface EscalationAlertEmailProps {
  userName: string;
  organizationName: string;
  escalationId: string;
  reason: string;
  priority: number;
  content: string;
  deadline: string | null;
  dashboardUrl: string;
}

export interface WeeklyReportEmailProps {
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

export type EmailTemplateProps =
  | { type: 'welcome'; props: WelcomeEmailProps }
  | { type: 'team-invite'; props: TeamInviteEmailProps }
  | { type: 'escalation-alert'; props: EscalationAlertEmailProps }
  | { type: 'weekly-report'; props: WeeklyReportEmailProps };
