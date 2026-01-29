/**
 * Organization Member Query Helpers
 * Centralized queries for fetching organization members with preferences
 */

import { eq } from 'drizzle-orm';
import { db } from '@/utils/db/db';
import { orgMembersTable, usersTable, userPreferencesTable } from '@/utils/db/schema';
import type { OrgRole } from '@/lib/rbac';

// =============================================================================
// TYPES
// =============================================================================

// Re-export OrgRole for consumers of this module
export type { OrgRole } from '@/lib/rbac';

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
 *
 * Uses a single JOIN query to avoid N+1 query problem
 */
async function getOrgMembersWithPreferences(
  orgId: string
): Promise<OrgMemberWithPreferences[]> {
  // Single query with LEFT JOIN to get members and preferences together
  const results = await db
    .select({
      userId: orgMembersTable.userId,
      role: orgMembersTable.role,
      userName: usersTable.name,
      userEmail: usersTable.email,
      escalationAlerts: userPreferencesTable.escalationAlerts,
      weeklyReport: userPreferencesTable.weeklyReport,
    })
    .from(orgMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, orgMembersTable.userId))
    .leftJoin(userPreferencesTable, eq(userPreferencesTable.userId, orgMembersTable.userId))
    .where(eq(orgMembersTable.orgId, orgId));

  // Map results with defaults for null preferences
  return results.map((row) => ({
    userId: row.userId,
    role: row.role as OrgRole,
    userName: row.userName,
    userEmail: row.userEmail,
    escalationAlerts: row.escalationAlerts ?? true,
    weeklyReport: row.weeklyReport ?? true,
  }));
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
