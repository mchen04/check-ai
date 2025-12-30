import StripePricingTable from "@/components/StripePricingTable";
import Image from "next/image"
import Link from "next/link"
import { createClient } from '@/utils/supabase/server'
import { createStripeCheckoutSession } from "@/utils/stripe/api";

export default async function Subscribe() {
    const supabase = createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    const checkoutSessionSecret = await createStripeCheckoutSession(user!.email!)

    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <header className="sticky top-0 z-50 w-full bg-background border-b px-4 lg:px-6 h-16 flex items-center">
                <Link href="/" className="flex items-center gap-2">
                    <Image src="/logo.png" alt="logo" width={50} height={50} />
                    <span className="sr-only">Acme Inc</span>
                </Link>
            </header>

            <main className="flex-1 container py-16 md:py-24 lg:py-32">
                <div className="text-center space-y-4 mb-12">
                    <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                        Pricing
                    </h1>
                    <p className="text-muted-foreground text-base md:text-lg lg:text-xl max-w-2xl mx-auto">
                        Choose the right plan for your team! Cancel anytime!
                    </p>
                </div>

                <StripePricingTable checkoutSessionSecret={checkoutSessionSecret} />
            </main>
        </div>
    )
}
