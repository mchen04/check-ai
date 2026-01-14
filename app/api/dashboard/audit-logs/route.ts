import { NextResponse } from 'next/server';
import { z } from 'zod';
import { queryAuditLogs } from '@/lib/audit';
import { auditEventTypeEnum } from '@/utils/db/schema';
import { withDashboardAuth, type DashboardRequest } from '@/lib/api/dashboard-middleware';
import { validate, createValidationErrorResponse } from '@/lib/api/validation';
import { formatRequiredDateToISO } from '@/lib/api/formatters';

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

async function handler(req: DashboardRequest) {
  const { context } = req;

  // Parse query parameters using shared validation
  const searchParams = Object.fromEntries(req.nextUrl.searchParams);
  const validation = validate(searchParams, QueryParamsSchema);
  if (!validation.success) return validation.error;

  const { eventType, userId, resourceType, startDate, endDate, limit, offset } = validation.data;

  const queryResult = await queryAuditLogs(
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
    logs: queryResult.logs.map((log) => ({
      id: log.id,
      eventType: log.eventType,
      description: log.description,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      changes: log.changes,
      createdAt: formatRequiredDateToISO(log.createdAt),
      user: log.userId
        ? {
            id: log.userId,
            name: log.userName,
            email: log.userEmail,
          }
        : null,
    })),
    pagination: {
      total: queryResult.total,
      limit: queryResult.limit,
      offset: queryResult.offset,
      hasMore: queryResult.offset + queryResult.limit < queryResult.total,
    },
  });
}

export const GET = withDashboardAuth(handler, { permission: 'audit_logs:view' });
