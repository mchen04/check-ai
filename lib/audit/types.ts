import type { AuditEventType, AuditChanges, AuditMetadata } from '@/utils/db/schema';

export type { AuditEventType, AuditChanges, AuditMetadata };

export interface AuditLogInput {
  orgId: string;
  userId?: string | null;
  eventType: AuditEventType;
  description: string;
  resourceType: string;
  resourceId?: string;
  changes?: AuditChanges;
  metadata?: AuditMetadata;
}

export interface AuditLogFilter {
  eventType?: AuditEventType | AuditEventType[];
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface AuditLogQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'asc' | 'desc';
}

// Human-readable event descriptions
export const AUDIT_EVENT_DESCRIPTIONS: Record<AuditEventType, string> = {
  'api_key.created': 'API key created',
  'api_key.deleted': 'API key deleted',
  'team_member.invited': 'Team member invited',
  'team_member.invite_revoked': 'Team invite revoked',
  'team_member.joined': 'Team member joined',
  'team_member.removed': 'Team member removed',
  'team_member.role_changed': 'Team member role changed',
  'webhook.created': 'Webhook created',
  'webhook.updated': 'Webhook updated',
  'webhook.deleted': 'Webhook deleted',
  'org.settings_updated': 'Organization settings updated',
  'escalation.resolved': 'Escalation resolved',
  'escalation.dismissed': 'Escalation dismissed',
};

// Resource type display names
export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  api_key: 'API Key',
  team_member: 'Team Member',
  invite: 'Invite',
  webhook: 'Webhook',
  organization: 'Organization',
  escalation: 'Escalation',
};
