/**
 * Organization Member Query Helpers
 * Centralized queries for fetching organization members with preferences
 */

import { db } from '@/utils/db/db';
import { orgMembersTable, usersTable, userPreferencesTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';

// =============================================================================
// TYPES
// =============================================================================

export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface OrgMemberWithUser {
  userId: string;
  role: OrgRole;
  userName: string | null;
  userEmail: string;
}

export interface OrgMemberWithPreferences extends OrgMemberWithUser {
  escalationAlerts: boolean;
  weeklyReport: boolean;
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get all members of an organization with their user details
 * Internal helper - use getMembersWithNotification for external access
 */
async function getOrgMembers(orgId: string): Promise<OrgMemberWithUser[]> {
  const members = await db
    .select({
      userId: orgMembersTable.userId,
      role: orgMembersTable.role,
      userName: usersTable.name,
      userEmail: usersTable.email,
    })
    .from(orgMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, orgMembersTable.userId))
    .where(eq(orgMembersTable.orgId, orgId));

  return members as OrgMemberWithUser[];
}

/**
 * Get org members with their notification preferences
 * Defaults to true for preferences if not set
 * Internal helper - use getMembersWithNotification for external access
 */
async function getOrgMembersWithPreferences(
  orgId: string
): Promise<OrgMemberWithPreferences[]> {
  const members = await getOrgMembers(orgId);

  return Promise.all(
    members.map(async (member) => {
      const [prefs] = await db
        .select({
          escalationAlerts: userPreferencesTable.escalationAlerts,
          weeklyReport: userPreferencesTable.weeklyReport,
        })
        .from(userPreferencesTable)
        .where(eq(userPreferencesTable.userId, member.userId));

      return {
        ...member,
        escalationAlerts: prefs?.escalationAlerts ?? true,
        weeklyReport: prefs?.weeklyReport ?? true,
      };
    })
  );
}

/**
 * Get members who have a specific notification type enabled
 */
export async function getMembersWithNotification(
  orgId: string,
  notificationType: 'escalationAlerts' | 'weeklyReport'
): Promise<OrgMemberWithUser[]> {
  const membersWithPrefs = await getOrgMembersWithPreferences(orgId);
  return membersWithPrefs.filter((m) => m[notificationType]);
}
