import Stripe from 'stripe';
import { db } from '@/utils/db/db';
import { organizationsTable, PLAN_LIMITS } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';
import { stripe, getPlanTypeFromName, PlanType } from '@/utils/stripe/api';

export async function POST(req: Request) {
  // Get raw body for signature verification (must be done before any parsing)
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  // Verify webhook signature
  if (!signature) {
    console.error('Stripe webhook: Missing stripe-signature header');
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Stripe webhook: STRIPE_WEBHOOK_SECRET not configured');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Stripe webhook signature verification failed:', errorMessage);
    return new Response(`Webhook signature verification failed: ${errorMessage}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        console.log(`Subscription ${event.type}:`, subscription.id);

        // Get product to determine plan type
        const priceItem = subscription.items?.data?.[0];
        if (!priceItem?.price?.product) {
          console.error('No product found in subscription');
          break;
        }

        const product = await stripe.products.retrieve(priceItem.price.product as string);
        const planType = getPlanTypeFromName(product.name);
        const limits = PLAN_LIMITS[planType];

        // Calculate verification limit (handle Infinity for enterprise)
        const verificationsLimit =
          limits.verificationsPerMonth === Infinity ? 1000000 : limits.verificationsPerMonth;

        // Update organization with new plan
        const result = await db
          .update(organizationsTable)
          .set({
            planType,
            verificationsLimit,
            stripeSubscriptionId: subscription.id,
            updatedAt: new Date(),
          })
          .where(eq(organizationsTable.stripeCustomerId, customerId));

        console.log(`Updated org to ${planType} plan with ${verificationsLimit} verifications/month`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        console.log('Subscription deleted:', subscription.id);

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

        console.log('Reset org to free plan');
        break;
      }

      case 'customer.created': {
        // Log when a new customer is created in Stripe
        console.log('Customer created:', event.data.object.id);
        break;
      }

      case 'invoice.paid': {
        // Log successful payments
        console.log('Invoice paid:', event.data.object.id);
        break;
      }

      case 'invoice.payment_failed': {
        // Log failed payments - could send alert email here
        console.log('Invoice payment failed:', event.data.object.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response('Success', { status: 200 });
  } catch (err) {
    console.error('Stripe webhook error:', err);
    return new Response(`Webhook error: ${err instanceof Error ? err.message : 'Unknown error'}`, {
      status: 400,
    });
  }
}
