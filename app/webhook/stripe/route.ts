import Stripe from 'stripe';
import { db } from '@/utils/db/db';
import { organizationsTable, PLAN_LIMITS } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';
import { stripe, getPlanTypeFromName, PlanType } from '@/utils/stripe/api';
import { createLogger } from '@/lib/logger';

const log = createLogger('StripeWebhook');

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

    return new Response('Success', { status: 200 });
  } catch (err) {
    log.error({ err }, 'Stripe webhook error');
    return new Response(`Webhook error: ${err instanceof Error ? err.message : 'Unknown error'}`, {
      status: 400,
    });
  }
}
