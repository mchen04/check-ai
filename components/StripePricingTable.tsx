'use client';
import React from 'react';

export default function StripePricingTable({
  checkoutSessionSecret,
}: {
  checkoutSessionSecret: string;
}) {
  return (
    <stripe-pricing-table
      pricing-table-id={process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID}
      publishable-key={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
      customer-session-client-secret={checkoutSessionSecret}
     />
  );
}
