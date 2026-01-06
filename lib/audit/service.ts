import { db } from '@/utils/db/db';
import { auditLogsTable, usersTable } from '@/utils/db/schema';
import { eq, and, desc, asc, gte, lte, inArray, sql } from 'drizzle-orm';
import type { AuditLogInput, AuditLogFilter, AuditLogQueryOptions } from './types';

/**
 * Create an audit log entry
 * Uses fire-and-forget pattern to avoid blocking main operations
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      orgId: input.orgId,
      userId: input.userId || null,
      eventType: input.eventType,
      description: input.description,
      resourceType: input.resourceType,
      resourceId: input.resourceId || null,
      changes: input.changes || null,
      metadata: input.metadata || null,
    });
  } catch (error) {
    // Log but don't throw - audit logging should never break main operations
    console.error('[Audit] Failed to create audit log:', error);
  }
}

/**
 * Queue audit log creation (non-blocking)
 * This is the preferred method for API routes
 */
export function logAuditEvent(input: AuditLogInput): void {
  // Fire and forget - don't await
  createAuditLog(input).catch((error) => {
    console.error('[Audit] Async audit log failed:', error);
  });
}

/**
 * Query audit logs with filtering and pagination
 */
export async function queryAuditLogs(
  orgId: string,
  filter?: AuditLogFilter,
  options?: AuditLogQueryOptions
) {
  const { limit = 50, offset = 0, orderBy = 'desc' } = options || {};

  // Build where conditions
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

  // Execute query with user join
  const logs = await db
    .select({
      id: auditLogsTable.id,
      eventType: auditLogsTable.eventType,
      description: auditLogsTable.description,
      resourceType: auditLogsTable.resourceType,
      resourceId: auditLogsTable.resourceId,
      changes: auditLogsTable.changes,
      metadata: auditLogsTable.metadata,
      createdAt: auditLogsTable.createdAt,
      userId: auditLogsTable.userId,
      userName: usersTable.name,
      userEmail: usersTable.email,
    })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
    .where(and(...conditions))
    .orderBy(orderBy === 'desc' ? desc(auditLogsTable.createdAt) : asc(auditLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogsTable)
    .where(and(...conditions));

  return {
    logs,
    total: Number(count),
    limit,
    offset,
  };
}

/**
 * Helper to extract request metadata for audit logs
 */
export function extractRequestMetadata(request: Request): { ipAddress: string; userAgent: string } {
  return {
    ipAddress:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  };
}

/**
 * Sanitize sensitive data from changes
 * Never log full API keys, passwords, or tokens
 */
export function sanitizeChanges(changes: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['key', 'token', 'secret', 'password', 'keyHash', 'signingSecret'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(changes)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeChanges(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
