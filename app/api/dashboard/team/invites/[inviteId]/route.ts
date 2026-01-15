import { NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { orgInvitesTable } from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';
import { withDashboardAuth, DashboardRequest } from '@/lib/api/dashboard-middleware';
import { createAuditLogger } from '@/lib/audit';

// =============================================================================
// DELETE - Revoke pending invite
// =============================================================================

async function handleDelete(
  req: DashboardRequest,
  routeContext?: { params: Promise<{ inviteId: string }> }
) {
  const { inviteId } = await routeContext!.params;
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
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  const audit = createAuditLogger(context, req);
  audit.log({
    eventType: 'team_member.invite_revoked',
    description: `Invite revoked for ${result[0].email}`,
    resourceType: 'invite',
    resourceId: inviteId,
  });

  return NextResponse.json({ success: true });
}

export const DELETE = withDashboardAuth(handleDelete, {
  permission: 'team:invite',
  requireProPlan: true,
});
