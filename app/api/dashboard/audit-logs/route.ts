import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserOrgContext, checkPermission } from '@/lib/rbac/get-user-org';
import { queryAuditLogs } from '@/lib/audit';
import { auditEventTypeEnum } from '@/utils/db/schema';

// =============================================================================
// GET - List audit logs with filtering and pagination
// =============================================================================

const QueryParamsSchema = z.object({
  eventType: z.enum(auditEventTypeEnum.enumValues).optional(),
  userId: z.string().optional(),
  resourceType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(req: NextRequest) {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC: Only owners and admins can view audit logs
    const { allowed, reason } = checkPermission(context, 'audit_logs:view');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = QueryParamsSchema.safeParse(searchParams);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { eventType, userId, resourceType, startDate, endDate, limit, offset } = parsed.data;

    const result = await queryAuditLogs(
      context.orgId,
      {
        eventType,
        userId,
        resourceType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      { limit, offset }
    );

    return NextResponse.json({
      logs: result.logs.map((log) => ({
        id: log.id,
        eventType: log.eventType,
        description: log.description,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        changes: log.changes,
        createdAt: log.createdAt.toISOString(),
        user: log.userId
          ? {
              id: log.userId,
              name: log.userName,
              email: log.userEmail,
            }
          : null,
      })),
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.offset + result.limit < result.total,
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
