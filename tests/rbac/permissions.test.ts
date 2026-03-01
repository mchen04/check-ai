/**
 * RBAC Permissions Tests
 * Tests role-based access control permission checks
 */

import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  canModifyRole,
  canRemoveMember,
  PERMISSIONS,
  type OrgRole,
  type Permission,
} from '@/lib/rbac/permissions';

// =============================================================================
// hasPermission
// =============================================================================

describe('hasPermission', () => {
  const allPermissions = Object.keys(PERMISSIONS) as Permission[];

  it('owner has all permissions', () => {
    for (const perm of allPermissions) {
      expect(hasPermission('owner', perm)).toBe(true);
    }
  });

  it('admin has admin-level permissions', () => {
    expect(hasPermission('admin', 'org:update')).toBe(true);
    expect(hasPermission('admin', 'team:invite')).toBe(true);
    expect(hasPermission('admin', 'api_keys:delete')).toBe(true);
    expect(hasPermission('admin', 'webhooks:create')).toBe(true);
    expect(hasPermission('admin', 'audit_logs:view')).toBe(true);
  });

  it('admin cannot access owner-only permissions', () => {
    expect(hasPermission('admin', 'org:delete')).toBe(false);
    expect(hasPermission('admin', 'billing:manage')).toBe(false);
  });

  it('member is restricted from delete and billing', () => {
    expect(hasPermission('member', 'api_keys:create')).toBe(true);
    expect(hasPermission('member', 'verifications:create')).toBe(true);
    expect(hasPermission('member', 'api_keys:delete')).toBe(false);
    expect(hasPermission('member', 'billing:manage')).toBe(false);
    expect(hasPermission('member', 'org:delete')).toBe(false);
    expect(hasPermission('member', 'webhooks:create')).toBe(false);
  });

  it('viewer is read-only', () => {
    expect(hasPermission('viewer', 'org:view')).toBe(true);
    expect(hasPermission('viewer', 'team:view')).toBe(true);
    expect(hasPermission('viewer', 'api_keys:view')).toBe(true);
    expect(hasPermission('viewer', 'verifications:view')).toBe(true);
    expect(hasPermission('viewer', 'usage:view')).toBe(true);
    expect(hasPermission('viewer', 'settings:view')).toBe(true);
  });

  it('viewer cannot create or modify', () => {
    expect(hasPermission('viewer', 'api_keys:create')).toBe(false);
    expect(hasPermission('viewer', 'verifications:create')).toBe(false);
    expect(hasPermission('viewer', 'team:invite')).toBe(false);
    expect(hasPermission('viewer', 'org:update')).toBe(false);
  });

  it('webhooks:view excludes viewer', () => {
    expect(hasPermission('owner', 'webhooks:view')).toBe(true);
    expect(hasPermission('admin', 'webhooks:view')).toBe(true);
    expect(hasPermission('member', 'webhooks:view')).toBe(true);
    expect(hasPermission('viewer', 'webhooks:view')).toBe(false);
  });

  it('audit_logs:view is owner and admin only', () => {
    expect(hasPermission('owner', 'audit_logs:view')).toBe(true);
    expect(hasPermission('admin', 'audit_logs:view')).toBe(true);
    expect(hasPermission('member', 'audit_logs:view')).toBe(false);
    expect(hasPermission('viewer', 'audit_logs:view')).toBe(false);
  });
});

// =============================================================================
// canModifyRole
// =============================================================================

describe('canModifyRole', () => {
  it('target=owner always returns false', () => {
    expect(canModifyRole('owner', 'owner', 'admin')).toBe(false);
    expect(canModifyRole('admin', 'owner', 'member')).toBe(false);
  });

  it('owner can modify non-owners', () => {
    expect(canModifyRole('owner', 'admin', 'member')).toBe(true);
    expect(canModifyRole('owner', 'member', 'admin')).toBe(true);
    expect(canModifyRole('owner', 'viewer', 'member')).toBe(true);
    expect(canModifyRole('owner', 'member', 'viewer')).toBe(true);
  });

  it('admin can demote member to viewer', () => {
    expect(canModifyRole('admin', 'member', 'viewer')).toBe(true);
  });

  it('admin can promote viewer to member', () => {
    expect(canModifyRole('admin', 'viewer', 'member')).toBe(true);
  });

  it('admin CANNOT promote to admin (privilege escalation)', () => {
    expect(canModifyRole('admin', 'member', 'admin')).toBe(false);
    expect(canModifyRole('admin', 'viewer', 'admin')).toBe(false);
  });

  it('admin CANNOT modify another admin', () => {
    expect(canModifyRole('admin', 'admin', 'member')).toBe(false);
  });

  it('member cannot modify anyone', () => {
    expect(canModifyRole('member', 'viewer', 'member')).toBe(false);
    expect(canModifyRole('member', 'member', 'viewer')).toBe(false);
  });

  it('viewer cannot modify anyone', () => {
    expect(canModifyRole('viewer', 'member', 'viewer')).toBe(false);
    expect(canModifyRole('viewer', 'viewer', 'member')).toBe(false);
  });
});

// =============================================================================
// canRemoveMember
// =============================================================================

describe('canRemoveMember', () => {
  it('cannot remove owner', () => {
    expect(canRemoveMember('owner', 'owner')).toBe(false);
    expect(canRemoveMember('admin', 'owner')).toBe(false);
  });

  it('owner can remove anyone except owner', () => {
    expect(canRemoveMember('owner', 'admin')).toBe(true);
    expect(canRemoveMember('owner', 'member')).toBe(true);
    expect(canRemoveMember('owner', 'viewer')).toBe(true);
  });

  it('admin can remove member and viewer', () => {
    expect(canRemoveMember('admin', 'member')).toBe(true);
    expect(canRemoveMember('admin', 'viewer')).toBe(true);
  });

  it('admin CANNOT remove another admin', () => {
    expect(canRemoveMember('admin', 'admin')).toBe(false);
  });

  it('member cannot remove anyone', () => {
    expect(canRemoveMember('member', 'viewer')).toBe(false);
    expect(canRemoveMember('member', 'member')).toBe(false);
  });

  it('viewer cannot remove anyone', () => {
    expect(canRemoveMember('viewer', 'member')).toBe(false);
    expect(canRemoveMember('viewer', 'viewer')).toBe(false);
  });
});
