'use client';
import Script from 'next/script';

export default function StripePricingTable({
  checkoutSessionSecret,
}: {
  checkoutSessionSecret: string;
}) {
  return (
    <>
      <Script
        src="https://js.stripe.com/v3/pricing-table.js"
        strategy="lazyOnload"
      />
      <stripe-pricing-table
        pricing-table-id={process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID}
        publishable-key={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
        customer-session-client-secret={checkoutSessionSecret}
      />
    </>
  );
}
