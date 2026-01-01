import { Stripe } from 'stripe';
import { db } from '../db/db';
import { usersTable, organizationsTable, PLAN_LIMITS } from '../db/schema';
import { eq, and, gte, sql } from "drizzle-orm";
import { verificationsTable } from '../db/schema';


export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const PUBLIC_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || "http://localhost:3001"

// =============================================================================
// PLAN TYPES
// =============================================================================

export type PlanType = 'free' | 'pro' | 'enterprise';

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

export async function getStripePlan(email: string): Promise<string> {
    const user = await db.select().from(usersTable).where(eq(usersTable.email, email))

    if (!user[0]?.plan) {
        return 'Free';
    }

    try {
        const subscription = await stripe.subscriptions.retrieve(user[0].plan);
        const productId = subscription.items.data[0].plan.product as string
        const product = await stripe.products.retrieve(productId)
        return product.name
    } catch {
        return 'Free';
    }
}

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
            and(
                eq(verificationsTable.orgId, orgId),
                gte(verificationsTable.createdAt, startOfMonth)
            )
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
                sql`created_at < ${startOfCurrentMonth}`
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
    const customer = await stripe.customers.create({
        name: name ? name : "",
        email: email,
        metadata: {
            supabase_id: id
        }
    });
    // Create a new customer in Stripe
    return customer.id
}

export async function createStripeCheckoutSession(email: string) {
    const user = await db.select().from(usersTable).where(eq(usersTable.email, email))
    const customerSession = await stripe.customerSessions.create({
        customer: user[0].stripe_id,
        components: {
            pricing_table: {
                enabled: true,
            },
        },
    });
    return customerSession.client_secret
}

export async function generateStripeBillingPortalLink(email: string) {
    const user = await db.select().from(usersTable).where(eq(usersTable.email, email))
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: user[0].stripe_id,
        return_url: `${PUBLIC_URL}/dashboard`,
    });
    return portalSession.url
}