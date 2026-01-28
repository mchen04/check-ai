import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '@/utils/db/db';
import { organizationsTable, PLAN_LIMITS } from '@/utils/db/schema';
import { stripe, getPlanTypeFromName, PlanType } from '@/utils/stripe/api';
import { createLogger } from '@/lib/logger';
import { getRedisClient } from '@/lib/cache/redis';

const log = createLogger('StripeWebhook');

// Event idempotency key prefix and TTL (7 days - matches Stripe's retry window of 3 days with buffer)
const IDEMPOTENCY_PREFIX = 'stripe:webhook:processed:';
const IDEMPOTENCY_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Check if an event has already been processed (idempotency guard)
 * Uses Redis for persistence across serverless function invocations
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    // If Redis is not available, log warning but allow processing
    // Better to risk duplicate processing than to block all webhooks
    log.warn({ eventId }, 'Redis not available for idempotency check');
    return false;
  }

  try {
    const exists = await redis.exists(`${IDEMPOTENCY_PREFIX}${eventId}`);
    return exists === 1;
  } catch (error) {
    log.error({ err: error, eventId }, 'Redis idempotency check error');
    return false;
  }
}

/**
 * Mark an event as processed with TTL
 */
async function markEventProcessed(eventId: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.setex(`${IDEMPOTENCY_PREFIX}${eventId}`, IDEMPOTENCY_TTL_SECONDS, '1');
  } catch (error) {
    log.error({ err: error, eventId }, 'Redis mark processed error');
  }
}

export async function POST(req: Request) {
  // Get raw body for signature verification (must be done before any parsing)
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  // Verify webhook signature
  if (!signature) {
    log.error('Missing stripe-signature header');
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log.error('STRIPE_WEBHOOK_SECRET not configured');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    log.error({ err }, 'Webhook signature verification failed');
    return new Response(`Webhook signature verification failed: ${errorMessage}`, { status: 400 });
  }

  // Check for duplicate events (idempotency)
  if (await isEventProcessed(event.id)) {
    log.info({ eventId: event.id }, 'Duplicate event received, skipping');
    return new Response('Event already processed', { status: 200 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        log.info({ eventType: event.type, subscriptionId: subscription.id }, 'Subscription event');

        // Get product to determine plan type
        const priceItem = subscription.items?.data?.[0];
        if (!priceItem?.price?.product) {
          log.error({ subscriptionId: subscription.id }, 'No product found in subscription');
          break;
        }

        const product = await stripe.products.retrieve(priceItem.price.product as string);
        const planType = getPlanTypeFromName(product.name);
        const limits = PLAN_LIMITS[planType];

        // Calculate verification limit (handle Infinity for enterprise)
        const verificationsLimit =
          limits.verificationsPerMonth === Infinity ? 1000000 : limits.verificationsPerMonth;

        // Update organization with new plan
        await db
          .update(organizationsTable)
          .set({
            planType,
            verificationsLimit,
            stripeSubscriptionId: subscription.id,
            updatedAt: new Date(),
          })
          .where(eq(organizationsTable.stripeCustomerId, customerId));

        log.info({ planType, verificationsLimit }, 'Updated org plan');
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        log.info({ subscriptionId: subscription.id }, 'Subscription deleted');

        // Reset organization to free plan
        await db
          .update(organizationsTable)
          .set({
            planType: 'free' as PlanType,
            verificationsLimit: PLAN_LIMITS.free.verificationsPerMonth,
            stripeSubscriptionId: null,
            updatedAt: new Date(),
          })
          .where(eq(organizationsTable.stripeCustomerId, customerId));

        log.info('Reset org to free plan');
        break;
      }

      case 'customer.created': {
        log.info({ customerId: event.data.object.id }, 'Customer created');
        break;
      }

      case 'invoice.paid': {
        log.info({ invoiceId: event.data.object.id }, 'Invoice paid');
        break;
      }

      case 'invoice.payment_failed': {
        log.warn({ invoiceId: event.data.object.id }, 'Invoice payment failed');
        break;
      }

      default:
        log.debug({ eventType: event.type }, 'Unhandled event type');
    }

    // Mark event as processed to prevent duplicate processing
    await markEventProcessed(event.id);

    return new Response('Success', { status: 200 });
  } catch (err) {
    // Log the error but return 200 to prevent Stripe from retrying
    // Non-transient errors (e.g., org not found) won't be fixed by retrying
    // Stripe will retry for 3 days if we return non-2xx, which wastes resources
    log.error({ err, eventId: event.id, eventType: event.type }, 'Stripe webhook processing error');

    // Still mark as processed to prevent retries from causing issues
    await markEventProcessed(event.id);

    return new Response('Acknowledged with error', { status: 200 });
  }
}
