import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/utils/db/db';
import { orgMembersTable } from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserOrgContext, checkPermission } from '@/lib/rbac/get-user-org';
import { canModifyRole, canRemoveMember, OrgRole } from '@/lib/rbac/permissions';
import { createAuditLogger } from '@/lib/audit';

// =============================================================================
// PATCH - Update member role
// =============================================================================

const UpdateRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await params;

    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(context, 'team:update_role', true);
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    // Parse body
    const body = await req.json();
    const parsed = UpdateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { role: newRole } = parsed.data;

    // Cannot modify self
    if (targetUserId === context.userId) {
      return NextResponse.json(
        { error: 'Cannot modify your own role' },
        { status: 400 }
      );
    }

    // Get target member
    const [targetMember] = await db
      .select({ role: orgMembersTable.role })
      .from(orgMembersTable)
      .where(
        and(
          eq(orgMembersTable.orgId, context.orgId),
          eq(orgMembersTable.userId, targetUserId)
        )
      )
      .limit(1);

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check role hierarchy
    if (!canModifyRole(context.role, targetMember.role as OrgRole, newRole as OrgRole)) {
      return NextResponse.json(
        { error: "Cannot modify this member's role" },
        { status: 403 }
      );
    }

    // Update role
    await db
      .update(orgMembersTable)
      .set({ role: newRole })
      .where(
        and(
          eq(orgMembersTable.orgId, context.orgId),
          eq(orgMembersTable.userId, targetUserId)
        )
      );

    const audit = createAuditLogger(context, req);
    audit.log({
      eventType: 'team_member.role_changed',
      description: `Member role changed from ${targetMember.role} to ${newRole}`,
      resourceType: 'team_member',
      resourceId: targetUserId,
      changes: { before: { role: targetMember.role }, after: { role: newRole } },
    });

    return NextResponse.json({ success: true, role: newRole });
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// DELETE - Remove member
// =============================================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await params;

    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(context, 'team:remove', true);
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    // Cannot remove self (must transfer ownership first)
    if (targetUserId === context.userId) {
      return NextResponse.json(
        { error: 'Cannot remove yourself. Transfer ownership first.' },
        { status: 400 }
      );
    }

    // Get target member
    const [targetMember] = await db
      .select({ role: orgMembersTable.role })
      .from(orgMembersTable)
      .where(
        and(
          eq(orgMembersTable.orgId, context.orgId),
          eq(orgMembersTable.userId, targetUserId)
        )
      )
      .limit(1);

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if actor can remove target
    if (!canRemoveMember(context.role, targetMember.role as OrgRole)) {
      return NextResponse.json(
        { error: 'Cannot remove this member' },
        { status: 403 }
      );
    }

    // Delete member
    await db
      .delete(orgMembersTable)
      .where(
        and(
          eq(orgMembersTable.orgId, context.orgId),
          eq(orgMembersTable.userId, targetUserId)
        )
      );

    const audit = createAuditLogger(context, req);
    audit.log({
      eventType: 'team_member.removed',
      description: `Team member removed`,
      resourceType: 'team_member',
      resourceId: targetUserId,
      changes: { before: { role: targetMember.role } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
