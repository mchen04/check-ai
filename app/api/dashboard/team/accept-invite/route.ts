import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/utils/db/db';
import { orgInvitesTable, orgMembersTable } from '@/utils/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/utils/supabase/server';
import { createAuditLogger } from '@/lib/audit';
import { createLogger } from '@/lib/logger';
import { errorResponse, parseAndValidate } from '@/lib/api';

const log = createLogger('AcceptInvite');

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
      return errorResponse.unauthorized();
    }

    // Parse body
    const parsed = await parseAndValidate(req, AcceptInviteSchema);
    if (!parsed.success) return parsed.error;

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
      return errorResponse.notFound('Invite not found or already used');
    }

    // Check expiration
    if (new Date() > invite.expiresAt) {
      await db
        .update(orgInvitesTable)
        .set({ status: 'expired' })
        .where(eq(orgInvitesTable.id, invite.id));

      return errorResponse.gone('This invite has expired');
    }

    // Verify email matches
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return errorResponse.forbidden('This invite was sent to a different email address');
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
      return errorResponse.conflict('You are already a member of this organization');
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
    log.error({ err: error }, 'Error accepting invite');
    return errorResponse.internalError();
  }
}
