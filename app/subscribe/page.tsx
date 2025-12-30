import StripePricingTable from '@/components/StripePricingTable';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { createStripeCheckoutSession } from '@/utils/stripe/api';

export default async function Subscribe() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const checkoutSessionSecret = await createStripeCheckoutSession(user!.email!);

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-50 flex h-16 w-full items-center border-b bg-background px-4 lg:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="logo" width={50} height={50} />
          <span className="sr-only">Acme Inc</span>
        </Link>
      </header>

      <main className="container flex-1 py-16 md:py-24 lg:py-32">
        <div className="mb-12 space-y-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">Pricing</h1>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg lg:text-xl">
            Choose the right plan for your team! Cancel anytime!
          </p>
        </div>

        <StripePricingTable checkoutSessionSecret={checkoutSessionSecret} />
      </main>
    </div>
  );
}
