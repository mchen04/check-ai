/**
 * Auth Context Helper
 * Provides utilities to get the current user's organization context
 */

import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/utils/db/db';
import { orgMembersTable, organizationsTable } from '@/utils/db/schema';
import { OrgRole, hasPermission, Permission } from './permissions';

export interface UserOrgContext {
  userId: string;
  userEmail: string;
  orgId: string;
  role: OrgRole;
  organization: {
    id: string;
    name: string;
    slug: string;
    planType: 'free' | 'pro' | 'enterprise';
    verificationsUsed: number;
    verificationsLimit: number;
  };
}

/**
 * Get authenticated user's organization context
 * Returns null if not authenticated or no org found
 * Wrapped with React.cache() for per-request deduplication
 */
export const getUserOrgContext = cache(async (): Promise<UserOrgContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const orgMember = await db.query.orgMembersTable.findFirst({
    where: eq(orgMembersTable.userId, user.id),
    with: {
      organization: true,
    },
  });

  if (!orgMember) return null;

  return {
    userId: user.id,
    userEmail: user.email || '',
    orgId: orgMember.orgId,
    role: orgMember.role as OrgRole,
    organization: {
      id: orgMember.organization.id,
      name: orgMember.organization.name,
      slug: orgMember.organization.slug,
      planType: orgMember.organization.planType as 'free' | 'pro' | 'enterprise',
      verificationsUsed: orgMember.organization.verificationsUsed,
      verificationsLimit: orgMember.organization.verificationsLimit,
    },
  };
});

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if user has permission, with optional plan-based gating
 */
export function checkPermission(
  context: UserOrgContext,
  permission: Permission,
  requireProPlan = false
): PermissionCheckResult {
  // Check plan requirement
  if (requireProPlan && context.organization.planType === 'free') {
    return { allowed: false, reason: 'This feature requires a Pro plan' };
  }

  // Check role permission
  if (!hasPermission(context.role, permission)) {
    return { allowed: false, reason: 'Insufficient permissions' };
  }

  return { allowed: true };
}
