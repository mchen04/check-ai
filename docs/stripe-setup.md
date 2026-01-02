# Stripe Setup Guide

This guide walks through setting up Stripe payments and webhooks for local development.

## Prerequisites

- Stripe account (sign up at https://stripe.com)
- Stripe CLI installed (`brew install stripe/stripe-cli/stripe` on macOS)
- Project running on `http://localhost:3001`

## Step 1: Get Stripe API Keys

1. Go to the Stripe Dashboard: https://dashboard.stripe.com/test/apikeys
2. Copy the following keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (click "Reveal test key", starts with `sk_test_`)

3. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```

## Step 2: Create Pricing Table

1. Go to https://dashboard.stripe.com/test/pricing-tables
2. Click **Create pricing table**
3. Add your products and prices
4. In **Confirmation page** section:
   - Select **Redirect to a URL**
   - Set URL to: `http://localhost:3001/dashboard`
5. Copy the **Pricing Table ID** (starts with `prctbl_`)
6. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID=prctbl_...
   ```

## Step 3: Authenticate Stripe CLI

The Stripe CLI needs to be authenticated to forward webhooks to your local development server.

```bash
stripe login
```

This will:
- Generate a pairing code
- Open your browser for authentication
- Store credentials for 90 days

**If your API key expires or changes**, re-authenticate:
```bash
stripe login --api-key sk_test_YOUR_NEW_KEY
```

## Step 4: Run Webhook Listener

In a separate terminal, run:

```bash
npm run stripe:listen
```

This forwards Stripe webhooks to `http://localhost:3001/webhook/stripe`

You should see:
```
Ready! Your webhook signing secret is whsec_...
```

**Important:** Keep this terminal running while testing payments.

## Step 5: Test the Flow

### For OAuth Signup (Google/GitHub):

1. Go to http://localhost:3001/signup
2. Click "Continue with Google" or "Continue with GitHub"
3. Complete OAuth authorization
4. You'll be redirected to `/subscribe`

### For Email/Password Signup:

1. Go to http://localhost:3001/signup
2. Enter name, email, password
3. Click "Sign Up"
4. You'll be redirected to `/subscribe`

### Complete Subscription:

1. On the pricing table, select a plan
2. On Stripe Checkout, enter test card:
   - **Card:** `4242 4242 4242 4242`
   - **Expiry:** Any future date (e.g., `12/34`)
   - **CVC:** Any 3 digits (e.g., `123`)
   - **Name:** Any name
3. Click **Subscribe**
4. Stripe will:
   - Process the payment
   - Send webhook to your local server
   - Webhook updates user's plan in database
   - Redirect to `/dashboard`

## How It Works

### Webhook Flow

When a subscription is created:

1. Stripe sends `customer.subscription.created` event
2. Stripe CLI forwards it to `http://localhost:3001/webhook/stripe`
3. Your webhook handler (`app/webhook/stripe/route.ts`) receives it
4. Updates the user's plan in the database:
   ```typescript
   await db
     .update(usersTable)
     .set({ plan: event.data.object.id })
     .where(eq(usersTable.stripe_id, event.data.object.customer));
   ```

### Dashboard Access Control

The dashboard layout (`app/dashboard/layout.tsx`) checks:

```typescript
if (checkUserInDB[0].plan === 'none') {
  return redirect('/subscribe');
}
```

Users with `plan: 'none'` are redirected to `/subscribe` until they complete payment.

## Troubleshooting

### "Expired API Key" Error

If you see:
```
Error while authenticating with Stripe: Authorization failed, status=401
code: "api_key_expired"
```

**Solution:** Re-authenticate the Stripe CLI:
```bash
stripe login
```

### Webhook Not Firing

1. Ensure `npm run stripe:listen` is running
2. Check the terminal output for webhook events
3. Verify your webhook handler has no errors

### Still Redirected to /subscribe After Payment

1. Check webhook listener is running
2. Check webhook handler logs in the terminal
3. Verify the subscription was created in Stripe Dashboard
4. Manually check user's plan in database:
   ```sql
   SELECT email, plan FROM users_table;
   ```

## Additional Test Cards

- **Visa:** `4242 4242 4242 4242`
- **Visa (debit):** `4000 0566 5566 5556`
- **Mastercard:** `5555 5555 5555 4444`
- **Declined card:** `4000 0000 0000 0002`
- **3D Secure required:** `4000 0027 6000 3184`

Full list: https://stripe.com/docs/testing

## Production Setup

In production, webhooks work differently:

1. Stripe sends webhooks directly to your deployed URL
2. Configure webhook endpoints at: https://dashboard.stripe.com/webhooks
3. Add your production URL: `https://yourdomain.com/webhook/stripe`
4. Copy the **signing secret** and add to production environment variables
5. Update webhook handler to verify signatures (for security)

## Resources

- Stripe Dashboard: https://dashboard.stripe.com
- Stripe CLI Docs: https://stripe.com/docs/stripe-cli
- Webhooks Guide: https://stripe.com/docs/webhooks
- Testing Guide: https://stripe.com/docs/testing
