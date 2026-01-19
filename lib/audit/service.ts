import { db } from '@/utils/db/db';
import { auditLogsTable, usersTable } from '@/utils/db/schema';
import { eq, and, desc, asc, gte, lte, inArray, sql, or, ilike } from 'drizzle-orm';
import type { AuditLogInput, AuditLogFilter, AuditLogQueryOptions } from './types';
import { createLogger } from '@/lib/logger';

const log = createLogger('Audit');

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
    log.error({ err: error }, 'Failed to create audit log');
  }
}

/**
 * Queue audit log creation (non-blocking)
 * This is the preferred method for API routes
 */
export function logAuditEvent(input: AuditLogInput): void {
  // Fire and forget - don't await
  createAuditLog(input).catch((error) => {
    log.error({ err: error }, 'Async audit log failed');
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

  if (filter?.search) {
    const searchPattern = `%${filter.search}%`;
    conditions.push(
      or(
        ilike(auditLogsTable.description, searchPattern),
        ilike(usersTable.name, searchPattern),
        ilike(usersTable.email, searchPattern)
      )
    );
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
 * Context type for dashboard requests (simplified for audit logging)
 */
interface AuditContext {
  orgId: string;
  userId: string;
}

/**
 * Input for contextual audit logging (without orgId, userId, metadata - auto-filled from context)
 */
export interface ContextualAuditInput {
  eventType: AuditLogInput['eventType'];
  description: string;
  resourceType: string;
  resourceId?: string;
  changes?: AuditLogInput['changes'];
}

/**
 * Create an audit logger bound to a request context
 * Reduces boilerplate by auto-filling orgId, userId, and request metadata
 *
 * @example
 * const audit = createAuditLogger(context, req);
 * audit.log({
 *   eventType: 'api_key.created',
 *   description: 'API key created',
 *   resourceType: 'api_key',
 *   resourceId: key.id,
 * });
 */
export function createAuditLogger(context: AuditContext, request: Request) {
  const metadata = extractRequestMetadata(request);

  return {
    /**
     * Log an audit event with context auto-filled
     */
    log(input: ContextualAuditInput): void {
      logAuditEvent({
        orgId: context.orgId,
        userId: context.userId,
        eventType: input.eventType,
        description: input.description,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        changes: input.changes,
        metadata,
      });
    },
  };
}
