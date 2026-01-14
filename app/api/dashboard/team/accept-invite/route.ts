import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/utils/db/db';
import { orgInvitesTable, orgMembersTable } from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/utils/supabase/server';
import { createAuditLogger } from '@/lib/audit';

const AcceptInviteSchema = z.object({
  token: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse body
    const body = await req.json();
    const parsed = AcceptInviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const { token } = parsed.data;

    // Find invite
    const [invite] = await db
      .select()
      .from(orgInvitesTable)
      .where(
        and(eq(orgInvitesTable.token, token), eq(orgInvitesTable.status, 'pending'))
      )
      .limit(1);

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found or already used' },
        { status: 404 }
      );
    }

    // Check expiration
    if (new Date() > invite.expiresAt) {
      await db
        .update(orgInvitesTable)
        .set({ status: 'expired' })
        .where(eq(orgInvitesTable.id, invite.id));

      return NextResponse.json({ error: 'This invite has expired' }, { status: 410 });
    }

    // Verify email matches
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invite was sent to a different email address' },
        { status: 403 }
      );
    }

    // Check if already a member
    const existingMember = await db
      .select()
      .from(orgMembersTable)
      .where(
        and(
          eq(orgMembersTable.orgId, invite.orgId),
          eq(orgMembersTable.userId, user.id)
        )
      )
      .limit(1);

    if (existingMember.length > 0) {
      return NextResponse.json(
        { error: 'You are already a member of this organization' },
        { status: 409 }
      );
    }

    // Add as member and mark invite as accepted (transaction)
    await db.transaction(async (tx) => {
      await tx.insert(orgMembersTable).values({
        orgId: invite.orgId,
        userId: user.id,
        role: invite.role,
      });

      await tx
        .update(orgInvitesTable)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
        })
        .where(eq(orgInvitesTable.id, invite.id));
    });

    const audit = createAuditLogger({ orgId: invite.orgId, userId: user.id }, req);
    audit.log({
      eventType: 'team_member.joined',
      description: `${user.email} joined the organization as ${invite.role}`,
      resourceType: 'team_member',
      resourceId: user.id,
      changes: { after: { role: invite.role, email: user.email } },
    });

    return NextResponse.json({
      success: true,
      orgId: invite.orgId,
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
