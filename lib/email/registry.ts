/**
 * Email Template Types Registry
 * Type definitions for email templates
 */

// =============================================================================
// Template Types
// =============================================================================

export type EmailTemplateType =
  | 'welcome'
  | 'team-invite'
  | 'escalation-alert'
  | 'weekly-report';

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
