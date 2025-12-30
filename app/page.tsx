import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import Link from "next/link"
import { Star, Check, Coins, UserCheck, Database } from "lucide-react"
import Stripe from 'stripe'

// Types
interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  features: string[];
  price: Stripe.Price;
}

// This makes the page dynamic instead of static
export const revalidate = 3600 // Revalidate every hour

async function getStripeProducts(): Promise<StripeProduct[]> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20'
  });

  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price']
  });

  return products.data.map(product => ({
    id: product.id,
    name: product.name,
    description: product.description,
    features: product.metadata?.features ? JSON.parse(product.metadata.features) : [],
    price: product.default_price as Stripe.Price
  }));
}

export default async function LandingPage() {
  const products = await getStripeProducts();

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <header className="sticky top-0 z-50 w-full bg-background border-b px-4 lg:px-6 h-16 flex items-center">
        <Link className="flex items-center justify-center" href="#">
          <Image src="/logo.png" alt="logo" width={50} height={50} />
          <span className="sr-only">Acme Inc</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <a className="text-sm font-medium hover:underline underline-offset-4" href="#features">
            Features
          </a>
          <a className="text-sm font-medium hover:underline underline-offset-4" href="#testimonials">
            Testimonials
          </a>
          <a className="text-sm font-medium hover:underline underline-offset-4" href="#pricing">
            Pricing
          </a>
        </nav>
        <Button asChild className="ml-4 md:ml-6 lg:ml-8">
          <Link href="/login">
            Get Started
          </Link>
        </Button>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-16 md:py-24 lg:py-32">
          <div className="container">
            <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
              <div className="flex flex-col space-y-6 md:w-1/2 w-full">
                <div className="space-y-4">
                  <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                    Saas Template with Supabase, Stripe, Databases
                  </h1>
                  <p className="text-lg text-muted-foreground md:text-xl leading-relaxed">
                    NextJS Boilerplate with everything required to build your next SAAS Product
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" asChild>
                    <Link href="/signup">Get Started</Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link href="#features">Learn More</Link>
                  </Button>
                </div>
              </div>
              <div className="w-full md:w-1/2 flex justify-center">
                <Image src="/hero.png" alt="Hero" width={500} height={500} priority className="w-full max-w-md md:max-w-full" />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-16 md:py-24 lg:py-32 bg-muted" id="features">
          <div className="container">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-center mb-8">
              Our Features
            </h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 mt-12">
              <div className="flex flex-col items-center space-y-4 border border-muted-foreground/10 p-6 rounded-lg bg-card hover:shadow-lg transition-shadow">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Coins className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Payments</h3>
                <p className="text-muted-foreground text-center leading-relaxed">
                  Seamlessly integrate Stripe Billing to capture subscription payments - Webhooks and all
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 border border-muted-foreground/10 p-6 rounded-lg bg-card hover:shadow-lg transition-shadow">
                <div className="p-3 bg-primary/10 rounded-full">
                  <UserCheck className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Auth</h3>
                <p className="text-muted-foreground text-center leading-relaxed">
                  Utilize our preexisting Supabase integration to auth your users and secure your app
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 border border-muted-foreground/10 p-6 rounded-lg bg-card hover:shadow-lg transition-shadow">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Database className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Database</h3>
                <p className="text-muted-foreground text-center leading-relaxed">
                  Hook into any PostgresDB instance
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="w-full py-16 md:py-24 lg:py-32" id="testimonials">
          <div className="container">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-center mb-8">
              What Our Customers Say
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-12">
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    &quot;This product has revolutionized our workflow. Highly recommended!&quot;
                  </p>
                  <p className="font-semibold">- Sarah J., CEO</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    &quot;Wow everything is already integrated! Less time configuring, more time building!&quot;
                  </p>
                  <p className="font-semibold">- Mark T., CTO</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    &quot;We&apos;ve seen a 200% increase in productivity since implementing this solution.&quot;
                  </p>
                  <p className="font-semibold">- Emily R., Operations Manager</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="w-full py-16 md:py-24 lg:py-32 bg-muted" id="pricing">
          <div className="container">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-center mb-4">
              Pricing Plans
            </h2>
            <p className="text-muted-foreground text-center mb-12 text-lg md:text-xl leading-relaxed">
              Choose the perfect plan for your needs
            </p>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {products.map((product) => (
                <Card key={product.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-2xl">{product.name}</CardTitle>
                    <CardDescription className="text-base">{product.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-4xl font-bold mb-6">
                      {product.price.unit_amount
                        ? `$${(product.price.unit_amount / 100).toFixed(2)}/${product.price.recurring?.interval}`
                        : 'Custom'}
                    </p>
                    <ul className="space-y-3">
                      {product.features?.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                          <span className="text-sm leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" size="lg" asChild>
                      <Link href={`/signup?plan=${product.id}`}>
                        Get Started
                      </Link>
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
            <div className="flex flex-col items-center justify-center space-y-6 text-center max-w-3xl mx-auto">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  Start Your Journey Today
                </h2>
                <p className="text-lg text-muted-foreground md:text-xl leading-relaxed">
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

      <footer className="flex flex-col gap-4 sm:flex-row py-8 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-sm text-muted-foreground">© 2024 Acme Inc. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-6">
          <Link className="text-sm hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-sm hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}
