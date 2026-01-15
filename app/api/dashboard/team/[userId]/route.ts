import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/utils/db/db';
import { orgMembersTable } from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';
import { withDashboardAuth, DashboardRequest } from '@/lib/api/dashboard-middleware';
import { canModifyRole, canRemoveMember, OrgRole } from '@/lib/rbac/permissions';
import { createAuditLogger } from '@/lib/audit';
import { extractRouteParam, RouteContext, parseAndValidate, errorResponse } from '@/lib/api/validation';

// =============================================================================
// PATCH - Update member role
// =============================================================================

const UpdateRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

async function handlePatch(
  req: DashboardRequest,
  routeContext?: RouteContext<{ userId: string }>
) {
  const targetUserId = await extractRouteParam(routeContext, 'userId');
  const { context } = req;

  // Parse and validate body using shared utility
  const result = await parseAndValidate(req, UpdateRoleSchema);
  if (!result.success) return result.error;

  const { role: newRole } = result.data;

  // Cannot modify self
  if (targetUserId === context.userId) {
    return errorResponse.badRequest('Cannot modify your own role');
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
    return errorResponse.notFound('Member not found');
  }

  // Check role hierarchy
  if (!canModifyRole(context.role, targetMember.role as OrgRole, newRole as OrgRole)) {
    return errorResponse.forbidden("Cannot modify this member's role");
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
}

export const PATCH = withDashboardAuth(handlePatch, {
  permission: 'team:update_role',
  requireProPlan: true,
});

// =============================================================================
// DELETE - Remove member
// =============================================================================

async function handleDelete(
  req: DashboardRequest,
  routeContext?: RouteContext<{ userId: string }>
) {
  const targetUserId = await extractRouteParam(routeContext, 'userId');
  const { context } = req;

  // Cannot remove self (must transfer ownership first)
  if (targetUserId === context.userId) {
    return errorResponse.badRequest('Cannot remove yourself. Transfer ownership first.');
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
    return errorResponse.notFound('Member not found');
  }

  // Check if actor can remove target
  if (!canRemoveMember(context.role, targetMember.role as OrgRole)) {
    return errorResponse.forbidden('Cannot remove this member');
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
}

export const DELETE = withDashboardAuth(handleDelete, {
  permission: 'team:remove',
  requireProPlan: true,
});
