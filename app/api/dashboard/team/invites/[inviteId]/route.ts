import { eq, and } from 'drizzle-orm';
import { db } from '@/utils/db/db';
import { orgInvitesTable } from '@/utils/db/schema';
import {
  withDashboardAuth,
  DashboardRequest,
  extractRouteParam,
  RouteContext,
  errorResponse,
  successResponse,
} from '@/lib/api';
import { createAuditLogger } from '@/lib/audit';

// =============================================================================
// DELETE - Revoke pending invite
// =============================================================================

async function handleDelete(
  req: DashboardRequest,
  routeContext?: RouteContext<{ inviteId: string }>
) {
  const inviteId = await extractRouteParam(routeContext, 'inviteId');
  const { context } = req;

  // Revoke invite
  const result = await db
    .update(orgInvitesTable)
    .set({ status: 'revoked' })
    .where(
      and(
        eq(orgInvitesTable.id, inviteId),
        eq(orgInvitesTable.orgId, context.orgId),
        eq(orgInvitesTable.status, 'pending')
      )
    )
    .returning({ id: orgInvitesTable.id, email: orgInvitesTable.email });

  if (result.length === 0) {
    return errorResponse.notFound('Invite not found');
  }

  const audit = createAuditLogger(context, req);
  audit.log({
    eventType: 'team_member.invite_revoked',
    description: `Invite revoked for ${result[0].email}`,
    resourceType: 'invite',
    resourceId: inviteId,
  });

  return successResponse.ok();
}

export const DELETE = withDashboardAuth(handleDelete, {
  permission: 'team:invite',
  requireProPlan: true,
});
