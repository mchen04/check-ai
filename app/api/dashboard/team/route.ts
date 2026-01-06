import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/utils/db/db';
import { orgMembersTable, usersTable, orgInvitesTable } from '@/utils/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getUserOrgContext, checkPermission } from '@/lib/rbac/get-user-org';
import { randomBytes } from 'crypto';
import { sendInviteEmail } from '@/lib/email/send-invite';
import { logAuditEvent, extractRequestMetadata } from '@/lib/audit';

// =============================================================================
// GET - List team members and pending invites
// =============================================================================

export async function GET() {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(context, 'team:view');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

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
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// POST - Send invite
// =============================================================================

const InviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member', 'viewer']),
});

export async function POST(req: NextRequest) {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission with Pro plan requirement
    const { allowed, reason } = checkPermission(context, 'team:invite', true);
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    // Parse and validate body
    const body = await req.json();
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, role } = parsed.data;

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
        return NextResponse.json(
          { error: 'User is already a member of this organization' },
          { status: 409 }
        );
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
      return NextResponse.json(
        { error: 'An invite is already pending for this email' },
        { status: 409 }
      );
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

    // Log audit event
    logAuditEvent({
      orgId: context.orgId,
      userId: context.userId,
      eventType: 'team_member.invited',
      description: `Invited ${email} as ${role}`,
      resourceType: 'invite',
      resourceId: invite.id,
      changes: { after: { email, role } },
      metadata: extractRequestMetadata(req),
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
  } catch (error) {
    console.error('Error creating invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
