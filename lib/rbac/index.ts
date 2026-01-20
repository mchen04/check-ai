/**
 * RBAC Module Barrel Export
 */

// Permissions
export {
  type OrgRole,
  type Permission,
  PERMISSIONS,
  hasPermission,
  canModifyRole,
  canRemoveMember,
} from './permissions';

// User Organization Context
export {
  type UserOrgContext,
  type PermissionCheckResult,
  getUserOrgContext,
  checkPermission,
} from './get-user-org';
