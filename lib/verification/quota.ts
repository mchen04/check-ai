/**
 * Verification Quota Management
 * Handles quota checking and method restrictions
 */

import { db } from '@/utils/db/db';
import { verificationsTable, PLAN_LIMITS } from '@/utils/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { MethodsConfig } from './types';
import { getRequestedMethods } from './validator';

// =============================================================================
// TYPES
// =============================================================================

export type PlanType = 'free' | 'pro' | 'enterprise';

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
 */
export function checkMethodsAllowed(
  methods: MethodsConfig,
  planType: PlanType
): MethodsCheckResult {
  const limits = PLAN_LIMITS[planType];
  const requestedMethods = getRequestedMethods(methods);
  const disallowedMethods = requestedMethods.filter(
    (method) => !(limits.allowedMethods as readonly string[]).includes(method)
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

/**
 * Get plan limits for a given plan type
 */
export function getPlanLimits(planType: PlanType) {
  return PLAN_LIMITS[planType];
}
