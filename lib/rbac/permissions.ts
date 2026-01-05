/**
 * RBAC Permission System
 * Defines role-based permissions for organization members
 */

export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Permission definitions mapping permission keys to allowed roles
 */
export const PERMISSIONS = {
  // Organization management
  'org:delete': ['owner'],
  'org:update': ['owner', 'admin'],
  'org:view': ['owner', 'admin', 'member', 'viewer'],

  // Team management
  'team:invite': ['owner', 'admin'],
  'team:remove': ['owner', 'admin'],
  'team:update_role': ['owner', 'admin'],
  'team:view': ['owner', 'admin', 'member', 'viewer'],

  // API Keys
  'api_keys:create': ['owner', 'admin', 'member'],
  'api_keys:delete': ['owner', 'admin'],
  'api_keys:view': ['owner', 'admin', 'member', 'viewer'],

  // Verifications
  'verifications:create': ['owner', 'admin', 'member'],
  'verifications:view': ['owner', 'admin', 'member', 'viewer'],

  // Escalations
  'escalations:resolve': ['owner', 'admin', 'member'],
  'escalations:view': ['owner', 'admin', 'member', 'viewer'],

  // Usage & Billing
  'billing:manage': ['owner'],
  'usage:view': ['owner', 'admin', 'member', 'viewer'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: OrgRole, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return (allowedRoles as readonly string[]).includes(role);
}

/**
 * Get all permissions for a given role
 */
export function getPermissionsForRole(role: OrgRole): Permission[] {
  return (Object.entries(PERMISSIONS) as [Permission, readonly OrgRole[]][])
    .filter(([_, roles]) => roles.includes(role))
    .map(([permission]) => permission);
}

/**
 * Role hierarchy for privilege comparisons
 * Higher number = more privileges
 */
export const ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

/**
 * Check if actor can modify target's role
 * - Owners can modify anyone except themselves (for ownership transfer)
 * - Admins can only modify members/viewers
 * - Members/viewers cannot modify roles
 */
export function canModifyRole(
  actorRole: OrgRole,
  targetRole: OrgRole,
  newRole: OrgRole
): boolean {
  // Only owner can modify owner (but not via this flow - ownership transfer is separate)
  if (targetRole === 'owner') return false;

  // Owner can do anything (except demote self, handled elsewhere)
  if (actorRole === 'owner') return true;

  // Admin can only modify members/viewers to member/viewer roles
  if (actorRole === 'admin') {
    return (
      ROLE_HIERARCHY[targetRole] < ROLE_HIERARCHY['admin'] &&
      ROLE_HIERARCHY[newRole] < ROLE_HIERARCHY['admin']
    );
  }

  return false;
}

/**
 * Check if actor can remove target from org
 */
export function canRemoveMember(actorRole: OrgRole, targetRole: OrgRole): boolean {
  // Cannot remove owner
  if (targetRole === 'owner') return false;

  // Owner can remove anyone
  if (actorRole === 'owner') return true;

  // Admin can remove members/viewers but not other admins
  if (actorRole === 'admin') {
    return ROLE_HIERARCHY[targetRole] < ROLE_HIERARCHY['admin'];
  }

  return false;
}

/**
 * Role display information
 */
export const ROLE_INFO: Record<OrgRole, { label: string; description: string }> = {
  owner: {
    label: 'Owner',
    description: 'Full access. Can delete organization, manage billing, and transfer ownership.',
  },
  admin: {
    label: 'Admin',
    description: 'Can manage members, API keys, and all features except billing.',
  },
  member: {
    label: 'Member',
    description: 'Can use API, create keys, view dashboard, and resolve escalations.',
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to dashboard, verifications, and usage data.',
  },
};
