/**
 * Email Module Barrel Export
 */

// Send functions
export { sendInviteEmail } from './send-invite';
export { sendWelcomeEmail } from './send-welcome';
export { sendEscalationAlert } from './send-escalation-alert';
export { sendWeeklyReportForOrg, sendAllWeeklyReports } from './send-weekly-report';

// Core utilities
export {
  sendEmail,
  isEmailConfigured,
  type EmailResult,
  type BulkEmailResult,
  type EmailContext,
} from './sender';

// Resend client
export { resend } from './resend';

// Styles (for templates)
export { emailStyles, type EmailStyles, type EmailStyleKey } from './styles';

// Templates
export { TeamInviteEmail } from './templates/team-invite';
export { EscalationAlertEmail } from './templates/escalation-alert';
export { WeeklyReportEmail } from './templates/weekly-report';
export { WelcomeEmail } from './templates/welcome';
export {
  BaseTemplate,
  StandardFooter,
  NotificationFooter,
} from './templates/base-template';
