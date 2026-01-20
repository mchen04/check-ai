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
  search?: string;
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
  'batch.created': 'Batch job created',
  'batch.completed': 'Batch job completed',
  'batch.failed': 'Batch job failed',
  'batch.cancelled': 'Batch job cancelled',
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

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Audit log as returned by the API (with nested user object)
 */
export interface ApiAuditLog {
  id: string;
  eventType: AuditEventType;
  description: string;
  resourceType: string;
  resourceId: string | null;
  changes: AuditChanges | null;
  metadata: AuditMetadata | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

/**
 * Flattened audit log for UI consumption
 */
export interface AuditLogDisplay {
  id: string;
  eventType: AuditEventType;
  description: string;
  resourceType: string;
  resourceId: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  changes: AuditChanges | null;
  metadata: AuditMetadata | null;
  createdAt: string;
}

/**
 * Standard paginated response for audit logs API
 */
export interface AuditLogsApiResponse {
  logs: ApiAuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Transform API audit log to display format
 */
export function transformApiAuditLog(log: ApiAuditLog): AuditLogDisplay {
  return {
    id: log.id,
    eventType: log.eventType,
    description: log.description,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    changes: log.changes,
    metadata: log.metadata,
    createdAt: log.createdAt,
    userId: log.user?.id || null,
    userName: log.user?.name || null,
    userEmail: log.user?.email || null,
  };
}
