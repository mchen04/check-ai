/**
 * Audit Repository
 * Database operations for audit log management
 */

import { db } from '@/utils/db/db';
import { auditLogsTable } from '@/utils/db/schema';
import { eq, and, gte, lte, desc, asc, inArray } from 'drizzle-orm';
import type {
  AuditLogInput,
  AuditLogFilter,
  AuditLogQueryOptions,
} from './types';
import type { AuditEventType, AuditChanges, AuditMetadata } from '@/utils/db/schema';

// =============================================================================
// TYPES
// =============================================================================

export interface AuditLogRecord {
  id: string;
  orgId: string;
  userId: string | null;
  eventType: AuditEventType;
  description: string;
  resourceType: string;
  resourceId: string | null;
  changes: AuditChanges | null;
  metadata: AuditMetadata | null;
  createdAt: Date;
}

// =============================================================================
// REPOSITORY FUNCTIONS
// =============================================================================

/**
 * Create a new audit log entry
 */
export async function createAuditLog(
  input: AuditLogInput
): Promise<AuditLogRecord> {
  const [log] = await db
    .insert(auditLogsTable)
    .values({
      orgId: input.orgId,
      userId: input.userId || null,
      eventType: input.eventType,
      description: input.description,
      resourceType: input.resourceType,
      resourceId: input.resourceId || null,
      changes: input.changes || null,
      metadata: input.metadata || null,
    })
    .returning();

  return log as AuditLogRecord;
}

/**
 * Query audit logs with filtering and pagination
 */
export async function queryAuditLogs(
  orgId: string,
  filter?: AuditLogFilter,
  options?: AuditLogQueryOptions
): Promise<{ logs: AuditLogRecord[]; hasMore: boolean }> {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  const order = options?.orderBy || 'desc';

  // Build conditions array
  const conditions = [eq(auditLogsTable.orgId, orgId)];

  if (filter?.eventType) {
    if (Array.isArray(filter.eventType)) {
      conditions.push(inArray(auditLogsTable.eventType, filter.eventType));
    } else {
      conditions.push(eq(auditLogsTable.eventType, filter.eventType));
    }
  }

  if (filter?.userId) {
    conditions.push(eq(auditLogsTable.userId, filter.userId));
  }

  if (filter?.resourceType) {
    conditions.push(eq(auditLogsTable.resourceType, filter.resourceType));
  }

  if (filter?.resourceId) {
    conditions.push(eq(auditLogsTable.resourceId, filter.resourceId));
  }

  if (filter?.startDate) {
    conditions.push(gte(auditLogsTable.createdAt, filter.startDate));
  }

  if (filter?.endDate) {
    conditions.push(lte(auditLogsTable.createdAt, filter.endDate));
  }

  const logs = await db
    .select()
    .from(auditLogsTable)
    .where(and(...conditions))
    .orderBy(order === 'desc' ? desc(auditLogsTable.createdAt) : asc(auditLogsTable.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = logs.length > limit;
  const results = hasMore ? logs.slice(0, limit) : logs;

  return { logs: results as AuditLogRecord[], hasMore };
}

/**
 * Get audit logs for a specific resource
 */
export async function getAuditLogsForResource(
  orgId: string,
  resourceType: string,
  resourceId: string,
  limit: number = 50
): Promise<AuditLogRecord[]> {
  const logs = await db
    .select()
    .from(auditLogsTable)
    .where(
      and(
        eq(auditLogsTable.orgId, orgId),
        eq(auditLogsTable.resourceType, resourceType),
        eq(auditLogsTable.resourceId, resourceId)
      )
    )
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit);

  return logs as AuditLogRecord[];
}

/**
 * Get recent audit logs for organization
 */
export async function getRecentAuditLogs(
  orgId: string,
  limit: number = 20
): Promise<AuditLogRecord[]> {
  const logs = await db
    .select()
    .from(auditLogsTable)
    .where(eq(auditLogsTable.orgId, orgId))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit);

  return logs as AuditLogRecord[];
}

/**
 * Get audit logs by user
 */
export async function getAuditLogsByUser(
  orgId: string,
  userId: string,
  limit: number = 50
): Promise<AuditLogRecord[]> {
  const logs = await db
    .select()
    .from(auditLogsTable)
    .where(and(eq(auditLogsTable.orgId, orgId), eq(auditLogsTable.userId, userId)))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit);

  return logs as AuditLogRecord[];
}

/**
 * Count audit logs by event type
 */
export async function countAuditLogsByEventType(
  orgId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Record<AuditEventType, number>> {
  const conditions = [eq(auditLogsTable.orgId, orgId)];

  if (startDate) {
    conditions.push(gte(auditLogsTable.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(auditLogsTable.createdAt, endDate));
  }

  const { sql } = await import('drizzle-orm');

  const results = await db
    .select({
      eventType: auditLogsTable.eventType,
      count: sql<number>`count(*)`,
    })
    .from(auditLogsTable)
    .where(and(...conditions))
    .groupBy(auditLogsTable.eventType);

  const counts: Record<string, number> = {};
  for (const row of results) {
    counts[row.eventType] = Number(row.count);
  }

  return counts as Record<AuditEventType, number>;
}
