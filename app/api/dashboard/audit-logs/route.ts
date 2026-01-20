import { NextResponse } from 'next/server';
import { z } from 'zod';
import { queryAuditLogs } from '@/lib/audit';
import { auditEventTypeEnum } from '@/utils/db/schema';
import {
  withDashboardAuth,
  type DashboardRequest,
  validate,
  formatRequiredDateToISO,
} from '@/lib/api';

// =============================================================================
// GET - List audit logs with filtering and pagination
// =============================================================================

const QueryParamsSchema = z.object({
  eventType: z.enum(auditEventTypeEnum.enumValues).optional(),
  userId: z.string().optional(),
  resourceType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).default(50),
  offset: z.coerce.number().min(0).default(0),
});

async function handler(req: DashboardRequest) {
  const { context } = req;

  // Parse query parameters using shared validation
  const searchParams = Object.fromEntries(req.nextUrl.searchParams);
  const validation = validate(searchParams, QueryParamsSchema);
  if (!validation.success) return validation.error;

  const { eventType, userId, resourceType, startDate, endDate, from, to, search, limit, offset } =
    validation.data;

  // Support both startDate/endDate and from/to parameters
  const effectiveStartDate = from || startDate;
  const effectiveEndDate = to || endDate;

  const queryResult = await queryAuditLogs(
    context.orgId,
    {
      eventType,
      userId,
      resourceType,
      startDate: effectiveStartDate ? new Date(effectiveStartDate) : undefined,
      endDate: effectiveEndDate ? new Date(effectiveEndDate) : undefined,
      search,
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
