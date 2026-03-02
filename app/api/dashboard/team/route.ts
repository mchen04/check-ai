import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@/utils/db/db';
import { orgMembersTable, usersTable, orgInvitesTable, PLAN_LIMITS, type PlanType } from '@/utils/db/schema';
import { sendInviteEmail } from '@/lib/email';
import { createAuditLogger } from '@/lib/audit';
import { withDashboardAuth, type DashboardRequest, parseAndValidate, errorResponse } from '@/lib/api';

// =============================================================================
// GET - List team members and pending invites
// =============================================================================

async function getHandler(req: DashboardRequest) {
  const { context } = req;

  // Get all members with user details
  const members = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: orgMembersTable.role,
      joinedAt: orgMembersTable.createdAt,
    })
    .from(orgMembersTable)
    .innerJoin(usersTable, eq(orgMembersTable.userId, usersTable.id))
    .where(eq(orgMembersTable.orgId, context.orgId))
    .orderBy(desc(orgMembersTable.createdAt));

  // Get pending invites
  const pendingInvites = await db
    .select({
      id: orgInvitesTable.id,
      email: orgInvitesTable.email,
      role: orgInvitesTable.role,
      invitedAt: orgInvitesTable.createdAt,
      expiresAt: orgInvitesTable.expiresAt,
    })
    .from(orgInvitesTable)
    .where(
      and(
        eq(orgInvitesTable.orgId, context.orgId),
        eq(orgInvitesTable.status, 'pending')
      )
    )
    .orderBy(desc(orgInvitesTable.createdAt));

  return NextResponse.json({
    members,
    pendingInvites,
    currentUserId: context.userId,
    currentUserRole: context.role,
    planType: context.organization.planType,
    organizationName: context.organization.name,
  });
}

export const GET = withDashboardAuth(getHandler, { permission: 'team:view' });

// =============================================================================
// POST - Send invite
// =============================================================================

const InviteSchema = z.object({
  email: z.email({ message: 'Invalid email address' }),
  role: z.enum(['admin', 'member', 'viewer']),
});

async function postHandler(req: DashboardRequest) {
  const { context } = req;
  const audit = createAuditLogger(context, req);

  // Parse and validate body using shared utility
  const result = await parseAndValidate(req, InviteSchema);
  if (!result.success) return result.error;

  const { email, role } = result.data;

  // Check team member limit based on plan
  const planLimits = PLAN_LIMITS[context.organization.planType as PlanType];
  const [memberCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orgMembersTable)
    .where(eq(orgMembersTable.orgId, context.orgId));
  const currentMembers = Number(memberCount?.count || 0);

  if (currentMembers >= planLimits.maxTeamMembers) {
    return errorResponse.forbidden(
      `Team member limit reached (${currentMembers}/${planLimits.maxTeamMembers}). Upgrade your plan to add more members.`
    );
  }

  // Check if user is already a member
  const existingUser = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (existingUser.length > 0) {
    const existingMember = await db
      .select()
      .from(orgMembersTable)
      .where(
        and(
          eq(orgMembersTable.orgId, context.orgId),
          eq(orgMembersTable.userId, existingUser[0].id)
        )
      )
      .limit(1);

    if (existingMember.length > 0) {
      return errorResponse.conflict('User is already a member of this organization');
    }
  }

  // Check for existing pending invite
  const existingInvite = await db
    .select()
    .from(orgInvitesTable)
    .where(
      and(
        eq(orgInvitesTable.orgId, context.orgId),
        eq(orgInvitesTable.email, email.toLowerCase()),
        eq(orgInvitesTable.status, 'pending')
      )
    )
    .limit(1);

  if (existingInvite.length > 0) {
    return errorResponse.conflict('An invite is already pending for this email');
  }

  // Generate secure token
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Create invite
  const [invite] = await db
    .insert(orgInvitesTable)
    .values({
      orgId: context.orgId,
      email: email.toLowerCase(),
      role,
      token,
      invitedBy: context.userId,
      expiresAt,
    })
    .returning();

  // Generate invite URL for response
  const baseUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3001';
  const inviteUrl = `${baseUrl}/invite/${token}`;

  audit.log({
    eventType: 'team_member.invited',
    description: `Invited ${email} as ${role}`,
    resourceType: 'invite',
    resourceId: invite.id,
    changes: { after: { email, role } },
  });

  // Send invite email (non-blocking - invite is still created if email fails)
  await sendInviteEmail({
    to: email,
    inviteUrl,
    organizationName: context.organization.name,
    role,
  });

  return NextResponse.json({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt.toISOString(),
    inviteUrl, // Include for testing/development
  });
}

export const POST = withDashboardAuth(postHandler, { permission: 'team:invite' });
