/**
 * Team Repository
 * Database operations for team members and invites
 */

import { db } from '@/utils/db/db';
import { orgMembersTable, usersTable, orgInvitesTable } from '@/utils/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// =============================================================================
// TYPES
// =============================================================================

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: MemberRole;
  joinedAt: Date;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: MemberRole;
  invitedAt: Date;
  expiresAt: Date;
}

export interface CreateInviteInput {
  orgId: string;
  email: string;
  role: MemberRole;
  token: string;
  invitedBy: string;
  expiresAt: Date;
}

export interface InviteRecord {
  id: string;
  orgId: string;
  email: string;
  role: string;
  token: string;
  invitedBy: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
}

// =============================================================================
// REPOSITORY FUNCTIONS
// =============================================================================

/**
 * Get all team members for an organization
 */
export async function getTeamMembers(orgId: string): Promise<TeamMember[]> {
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
    .where(eq(orgMembersTable.orgId, orgId))
    .orderBy(desc(orgMembersTable.createdAt));

  return members as TeamMember[];
}

/**
 * Get pending invites for an organization
 */
export async function getPendingInvites(orgId: string): Promise<PendingInvite[]> {
  const invites = await db
    .select({
      id: orgInvitesTable.id,
      email: orgInvitesTable.email,
      role: orgInvitesTable.role,
      invitedAt: orgInvitesTable.createdAt,
      expiresAt: orgInvitesTable.expiresAt,
    })
    .from(orgInvitesTable)
    .where(
      and(eq(orgInvitesTable.orgId, orgId), eq(orgInvitesTable.status, 'pending'))
    )
    .orderBy(desc(orgInvitesTable.createdAt));

  return invites as PendingInvite[];
}

/**
 * Find user by email
 */
export async function findUserByEmail(
  email: string
): Promise<{ id: string } | null> {
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  return user || null;
}

/**
 * Check if user is already a member of organization
 */
export async function isMemberOfOrg(
  orgId: string,
  userId: string
): Promise<boolean> {
  const [member] = await db
    .select()
    .from(orgMembersTable)
    .where(and(eq(orgMembersTable.orgId, orgId), eq(orgMembersTable.userId, userId)))
    .limit(1);

  return !!member;
}

/**
 * Check if there's a pending invite for email in organization
 */
export async function hasPendingInvite(
  orgId: string,
  email: string
): Promise<boolean> {
  const [invite] = await db
    .select()
    .from(orgInvitesTable)
    .where(
      and(
        eq(orgInvitesTable.orgId, orgId),
        eq(orgInvitesTable.email, email.toLowerCase()),
        eq(orgInvitesTable.status, 'pending')
      )
    )
    .limit(1);

  return !!invite;
}

/**
 * Create a new invite
 */
export async function createInvite(
  input: CreateInviteInput
): Promise<InviteRecord> {
  const [invite] = await db
    .insert(orgInvitesTable)
    .values({
      orgId: input.orgId,
      email: input.email.toLowerCase(),
      role: input.role,
      token: input.token,
      invitedBy: input.invitedBy,
      expiresAt: input.expiresAt,
    })
    .returning();

  return invite as InviteRecord;
}

/**
 * Find invite by token
 */
export async function findInviteByToken(
  token: string
): Promise<InviteRecord | null> {
  const invite = await db.query.orgInvitesTable.findFirst({
    where: eq(orgInvitesTable.token, token),
  });

  return invite ? (invite as InviteRecord) : null;
}

/**
 * Accept invite and add member
 */
export async function acceptInvite(
  inviteId: string,
  userId: string
): Promise<void> {
  await db.transaction(async (tx) => {
    // Get invite details
    const [invite] = await tx
      .select()
      .from(orgInvitesTable)
      .where(eq(orgInvitesTable.id, inviteId))
      .limit(1);

    if (!invite) {
      throw new Error('Invite not found');
    }

    // Add member to organization
    await tx.insert(orgMembersTable).values({
      orgId: invite.orgId,
      userId,
      role: invite.role,
    });

    // Update invite status
    await tx
      .update(orgInvitesTable)
      .set({ status: 'accepted' })
      .where(eq(orgInvitesTable.id, inviteId));
  });
}

/**
 * Revoke an invite
 */
export async function revokeInvite(inviteId: string, orgId: string): Promise<void> {
  await db
    .update(orgInvitesTable)
    .set({ status: 'revoked' })
    .where(and(eq(orgInvitesTable.id, inviteId), eq(orgInvitesTable.orgId, orgId)));
}

/**
 * Update member role
 */
export async function updateMemberRole(
  orgId: string,
  userId: string,
  newRole: MemberRole
): Promise<void> {
  await db
    .update(orgMembersTable)
    .set({ role: newRole })
    .where(and(eq(orgMembersTable.orgId, orgId), eq(orgMembersTable.userId, userId)));
}

/**
 * Remove member from organization
 */
export async function removeMember(orgId: string, userId: string): Promise<void> {
  await db
    .delete(orgMembersTable)
    .where(and(eq(orgMembersTable.orgId, orgId), eq(orgMembersTable.userId, userId)));
}
