import { Stripe } from 'stripe';
import { db } from '../db/db';
import {
  organizationsTable,
  orgMembersTable,
  verificationsTable,
  PLAN_LIMITS,
  type PlanType,
} from '../db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

// Stripe SDK configuration following best practices:
// - Pin API version for stability (matches SDK v16.9.0)
// - Enable automatic retries for network resilience
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  maxNetworkRetries: 2,
});
const PUBLIC_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3001';

// =============================================================================
// PLAN TYPES
// =============================================================================

// Re-export PlanType for consumers of this module
export type { PlanType } from '../db/schema';

export interface PlanDetails {
  type: PlanType;
  name: string;
  verificationsPerMonth: number;
  verificationsUsed: number;
  verificationsRemaining: number;
  allowedMethods: readonly string[];
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

// =============================================================================
// PLAN FUNCTIONS
// =============================================================================

/**
 * Get plan type from Stripe product name
 */
export function getPlanTypeFromName(productName: string): PlanType {
  const name = productName.toLowerCase();

  if (name.includes('enterprise')) {
    return 'enterprise';
  }
  if (name.includes('pro') || name.includes('professional')) {
    return 'pro';
  }

  return 'free';
}

/**
 * Get plan details for an organization
 */
export async function getOrgPlanDetails(orgId: string): Promise<PlanDetails> {
  const org = await db.query.organizationsTable.findFirst({
    where: eq(organizationsTable.id, orgId),
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  const planType = org.planType as PlanType;
  const limits = PLAN_LIMITS[planType];

  // Get current month's usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [usageResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(verificationsTable)
    .where(
      and(eq(verificationsTable.orgId, orgId), gte(verificationsTable.createdAt, startOfMonth))
    );

  const verificationsUsed = Number(usageResult?.count || 0);
  const verificationsRemaining = Math.max(0, limits.verificationsPerMonth - verificationsUsed);

  return {
    type: planType,
    name: planType.charAt(0).toUpperCase() + planType.slice(1),
    verificationsPerMonth: limits.verificationsPerMonth,
    verificationsUsed,
    verificationsRemaining,
    allowedMethods: limits.allowedMethods,
    rateLimit: limits.rateLimit,
  };
}

/**
 * Check if a method is allowed for the given plan
 */
export function isMethodAllowed(planType: PlanType, method: string): boolean {
  const limits = PLAN_LIMITS[planType];
  return (limits.allowedMethods as readonly string[]).includes(method);
}

/**
 * Get usage statistics for billing
 */
export async function getUsageStats(orgId: string): Promise<{
  currentMonth: {
    verifications: number;
    totalCost: number;
    byMethod: Record<string, number>;
  };
  previousMonth: {
    verifications: number;
    totalCost: number;
  };
}> {
  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Current month stats
  const currentMonthVerifications = await db
    .select({
      count: sql<number>`count(*)`,
      totalCost: sql<number>`COALESCE(SUM(cost_cents::numeric), 0)`,
    })
    .from(verificationsTable)
    .where(
      and(
        eq(verificationsTable.orgId, orgId),
        gte(verificationsTable.createdAt, startOfCurrentMonth)
      )
    );

  // Previous month stats
  const previousMonthVerifications = await db
    .select({
      count: sql<number>`count(*)`,
      totalCost: sql<number>`COALESCE(SUM(cost_cents::numeric), 0)`,
    })
    .from(verificationsTable)
    .where(
      and(
        eq(verificationsTable.orgId, orgId),
        gte(verificationsTable.createdAt, startOfPreviousMonth),
        sql`created_at < ${startOfCurrentMonth.toISOString()}`
      )
    );

  // Get method breakdown for current month
  const methodBreakdown = await db
    .select({
      method: sql<string>`methods_config->>'reasoning'`, // Just checking one for now
      count: sql<number>`count(*)`,
    })
    .from(verificationsTable)
    .where(
      and(
        eq(verificationsTable.orgId, orgId),
        gte(verificationsTable.createdAt, startOfCurrentMonth)
      )
    )
    .groupBy(sql`methods_config`);

  return {
    currentMonth: {
      verifications: Number(currentMonthVerifications[0]?.count || 0),
      totalCost: Number(currentMonthVerifications[0]?.totalCost || 0) / 100, // Convert cents to dollars
      byMethod: {}, // Would need more complex query
    },
    previousMonth: {
      verifications: Number(previousMonthVerifications[0]?.count || 0),
      totalCost: Number(previousMonthVerifications[0]?.totalCost || 0) / 100,
    },
  };
}

export async function createStripeCustomer(id: string, email: string, name?: string) {
  const customer = await stripe.customers.create(
    {
      name: name ? name : '',
      email: email,
      metadata: {
        supabase_id: id,
      },
    },
    {
      // Idempotency key prevents duplicate customers on retries
      idempotencyKey: `create-customer-${id}`,
    }
  );
  return customer.id;
}

/**
 * Get the user's organization with Stripe customer ID
 */
async function getOrgForUser(userId: string) {
  const membership = await db.query.orgMembersTable.findFirst({
    where: eq(orgMembersTable.userId, userId),
    with: {
      organization: true,
    },
  });

  if (!membership?.organization?.stripeCustomerId) {
    throw new Error('Organization or Stripe customer not found');
  }

  return membership.organization;
}

/**
 * Create a Stripe checkout session for the pricing table
 * Uses organization-level Stripe customer ID
 */
export async function createStripeCheckoutSession(userId: string) {
  const org = await getOrgForUser(userId);

  const customerSession = await stripe.customerSessions.create({
    customer: org.stripeCustomerId!,
    components: {
      pricing_table: {
        enabled: true,
      },
    },
  });
  return customerSession.client_secret;
}

/**
 * Generate a Stripe billing portal link for managing subscription
 * Uses organization-level Stripe customer ID
 */
export async function generateStripeBillingPortalLink(userId: string) {
  const org = await getOrgForUser(userId);

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId!,
    return_url: `${PUBLIC_URL}/dashboard`,
  });
  return portalSession.url;
}
