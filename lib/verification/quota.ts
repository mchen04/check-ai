/**
 * Verification Quota Management
 * Handles quota checking and method restrictions
 */

import { eq, and, gte, sql } from 'drizzle-orm';
import { db } from '@/utils/db/db';
import { verificationsTable, PLAN_LIMITS, type PlanType } from '@/utils/db/schema';
import { MethodsConfig } from './types';
import { getRequestedMethods } from './validator';

// =============================================================================
// TYPES
// =============================================================================

// Re-export PlanType for consumers of this module
export type { PlanType } from '@/utils/db/schema';

export interface QuotaCheckResult {
  allowed: boolean;
  error?: string;
  currentCount?: number;
  limit?: number;
}

export interface MethodsCheckResult {
  allowed: boolean;
  disallowedMethods?: string[];
}

// =============================================================================
// QUOTA CHECKING
// =============================================================================

/**
 * Check if requested methods are allowed for the plan
 * Uses Set for O(1) lookups (js-set-map-lookups)
 */
export function checkMethodsAllowed(
  methods: MethodsConfig,
  planType: PlanType
): MethodsCheckResult {
  const limits = PLAN_LIMITS[planType];
  const requestedMethods = getRequestedMethods(methods);
  // Build Set once for O(1) lookups instead of O(n) array.includes()
  const allowedMethodsSet = new Set<string>(limits.allowedMethods);
  const disallowedMethods = requestedMethods.filter(
    (method) => !allowedMethodsSet.has(method)
  );

  if (disallowedMethods.length > 0) {
    return {
      allowed: false,
      disallowedMethods,
    };
  }

  return { allowed: true };
}

/**
 * Check monthly verification quota
 */
export async function checkMonthlyQuota(
  orgId: string,
  planType: PlanType
): Promise<QuotaCheckResult> {
  const limits = PLAN_LIMITS[planType];

  // Enterprise has unlimited verifications
  if (limits.verificationsPerMonth === Infinity) {
    return { allowed: true };
  }

  // Count verifications this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(verificationsTable)
    .where(
      and(eq(verificationsTable.orgId, orgId), gte(verificationsTable.createdAt, startOfMonth))
    );

  const currentCount = Number(countResult?.count || 0);

  if (currentCount >= limits.verificationsPerMonth) {
    return {
      allowed: false,
      error: `Monthly verification limit reached (${limits.verificationsPerMonth}). Upgrade your plan for more verifications.`,
      currentCount,
      limit: limits.verificationsPerMonth,
    };
  }

  return {
    allowed: true,
    currentCount,
    limit: limits.verificationsPerMonth,
  };
}
