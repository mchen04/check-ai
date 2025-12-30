import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import Link from 'next/link';
import { Star, Check, Coins, UserCheck, Database } from 'lucide-react';
import Stripe from 'stripe';

// Types
interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  features: string[];
  price: Stripe.Price;
}

// This makes the page dynamic instead of static
export const revalidate = 3600; // Revalidate every hour

async function getStripeProducts(): Promise<StripeProduct[]> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
  });

  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price'],
  });

  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    features: product.metadata?.features ? JSON.parse(product.metadata.features) : [],
    price: product.default_price as Stripe.Price,
  }));
}

export default async function LandingPage() {
  const products = await getStripeProducts();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-50 flex h-16 w-full items-center border-b bg-background px-4 lg:px-6">
        <Link className="flex items-center justify-center" href="#">
          <Image src="/logo.png" alt="logo" width={50} height={50} />
          <span className="sr-only">Acme Inc</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <a className="text-sm font-medium underline-offset-4 hover:underline" href="#features">
            Features
          </a>
          <a
            className="text-sm font-medium underline-offset-4 hover:underline"
            href="#testimonials"
          >
            Testimonials
          </a>
          <a className="text-sm font-medium underline-offset-4 hover:underline" href="#pricing">
            Pricing
          </a>
        </nav>
        <Button asChild className="ml-4 md:ml-6 lg:ml-8">
          <Link href="/login">Get Started</Link>
        </Button>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-16 md:py-24 lg:py-32">
          <div className="container">
            <div className="flex flex-col items-center gap-8 md:flex-row md:gap-12">
              <div className="flex w-full flex-col space-y-6 md:w-1/2">
                <div className="space-y-4">
                  <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                    Saas Template with Supabase, Stripe, Databases
                  </h1>
                  <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
                    NextJS Boilerplate with everything required to build your next SAAS Product
                  </p>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/signup">Get Started</Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link href="#features">Learn More</Link>
                  </Button>
                </div>
              </div>
              <div className="flex w-full justify-center md:w-1/2">
                <Image
                  src="/hero.png"
                  alt="Hero"
                  width={500}
                  height={500}
                  priority
                  className="w-full max-w-md md:max-w-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full bg-muted py-16 md:py-24 lg:py-32" id="features">
          <div className="container">
            <h2 className="mb-8 text-center text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Our Features
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 rounded-lg border border-muted-foreground/10 bg-card p-6 transition-shadow hover:shadow-lg">
                <div className="rounded-full bg-primary/10 p-3">
                  <Coins className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Payments</h3>
                <p className="text-center leading-relaxed text-muted-foreground">
                  Seamlessly integrate Stripe Billing to capture subscription payments - Webhooks
                  and all
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 rounded-lg border border-muted-foreground/10 bg-card p-6 transition-shadow hover:shadow-lg">
                <div className="rounded-full bg-primary/10 p-3">
                  <UserCheck className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Auth</h3>
                <p className="text-center leading-relaxed text-muted-foreground">
                  Utilize our preexisting Supabase integration to auth your users and secure your
                  app
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 rounded-lg border border-muted-foreground/10 bg-card p-6 transition-shadow hover:shadow-lg">
                <div className="rounded-full bg-primary/10 p-3">
                  <Database className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Database</h3>
                <p className="text-center leading-relaxed text-muted-foreground">
                  Hook into any PostgresDB instance
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="w-full py-16 md:py-24 lg:py-32" id="testimonials">
          <div className="container">
            <h2 className="mb-8 text-center text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              What Our Customers Say
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="transition-shadow hover:shadow-lg">
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="mb-4 leading-relaxed text-muted-foreground">
                    &quot;This product has revolutionized our workflow. Highly recommended!&quot;
                  </p>
                  <p className="font-semibold">- Sarah J., CEO</p>
                </CardContent>
              </Card>
              <Card className="transition-shadow hover:shadow-lg">
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="mb-4 leading-relaxed text-muted-foreground">
                    &quot;Wow everything is already integrated! Less time configuring, more time
                    building!&quot;
                  </p>
                  <p className="font-semibold">- Mark T., CTO</p>
                </CardContent>
              </Card>
              <Card className="transition-shadow hover:shadow-lg">
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="mb-4 leading-relaxed text-muted-foreground">
                    &quot;We&apos;ve seen a 200% increase in productivity since implementing this
                    solution.&quot;
                  </p>
                  <p className="font-semibold">- Emily R., Operations Manager</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="w-full bg-muted py-16 md:py-24 lg:py-32" id="pricing">
          <div className="container">
            <h2 className="mb-4 text-center text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Pricing Plans
            </h2>
            <p className="mb-12 text-center text-lg leading-relaxed text-muted-foreground md:text-xl">
              Choose the perfect plan for your needs
            </p>
            <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <Card key={product.id} className="flex flex-col transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl">{product.name}</CardTitle>
                    <CardDescription className="text-base">{product.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="mb-6 text-4xl font-bold">
                      {product.price.unit_amount
                        ? `$${(product.price.unit_amount / 100).toFixed(2)}/${product.price.recurring?.interval}`
                        : 'Custom'}
                    </p>
                    <ul className="space-y-3">
                      {product.features?.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                          <span className="text-sm leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" size="lg" asChild>
                      <Link href={`/signup?plan=${product.id}`}>Get Started</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-16 md:py-24 lg:py-32">
          <div className="container">
            <div className="mx-auto flex max-w-3xl flex-col items-center justify-center space-y-6 text-center">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  Start Your Journey Today
                </h2>
                <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
                  Join thousands of satisfied customers and take your business to the next level.
                </p>
              </div>
              <Button size="lg" className="px-8 py-6 text-lg" asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex w-full shrink-0 flex-col items-center gap-4 border-t px-4 py-8 sm:flex-row md:px-6">
        <p className="text-sm text-muted-foreground">© 2024 Acme Inc. All rights reserved.</p>
        <nav className="flex gap-6 sm:ml-auto">
          <Link className="text-sm underline-offset-4 hover:underline" href="#">
            Terms of Service
          </Link>
          <Link className="text-sm underline-offset-4 hover:underline" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
