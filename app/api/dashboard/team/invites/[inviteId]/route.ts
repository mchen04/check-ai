import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/utils/db/db';
import { orgInvitesTable } from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserOrgContext, checkPermission } from '@/lib/rbac/get-user-org';

// =============================================================================
// DELETE - Revoke pending invite
// =============================================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const { inviteId } = await params;

    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(context, 'team:invite', true);
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

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
      .returning({ id: orgInvitesTable.id });

    if (result.length === 0) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
