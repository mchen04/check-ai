import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Shield, Zap, Code, Activity, BarChart, FileText, Check, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Stripe from 'stripe';
import HeroDashboard from '@/components/hero-dashboard';

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
    <div className="relative flex min-h-[100dvh] flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link className="flex items-center gap-2.5" href="/">
            <Image src="/logo.svg" alt="Check" width={28} height={28} />
            <span className="text-lg font-semibold tracking-tight">Check</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              href="#methods"
            >
              How it works
            </a>
            <a
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              href="#pricing"
            >
              Pricing
            </a>
            <Link
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              href="/docs"
            >
              Docs
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section - Clean and focused */}
        <section className="relative overflow-hidden pb-24 pt-16 lg:pb-32 lg:pt-24">
          {/* Subtle gradient orb */}
          <div className="bg-hero-glow pointer-events-none absolute -right-40 top-0 h-[600px] w-[600px] rounded-full opacity-30 blur-[120px]" />

          <div className="mx-auto max-w-6xl px-6">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              {/* Left: Text Content */}
              <div className="relative z-10">
                {/* Eyebrow */}
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">Seven verification methods, one API</span>
                </div>

                <h1 className="mb-6 text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem]">
                  Your AI outputs cost{' '}
                  <span className="text-primary">$2.4M</span>{' '}
                  when they&apos;re wrong
                </h1>

                <p className="mb-8 max-w-lg text-lg leading-relaxed text-muted-foreground">
                  Catch hallucinations before deployment with seven research-backed verification methods. Configure the mix for your use case.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" asChild className="gap-2">
                    <Link href="/signup">
                      Get started free
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link href="#methods">See how it works</Link>
                  </Button>
                </div>

                {/* Trust indicators */}
                <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>No credit card</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>100 free verifications</span>
                  </div>
                </div>
              </div>

              {/* Right: Dashboard Preview */}
              <div className="relative lg:pl-8">
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  <HeroDashboard />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section - Editorial typography */}
        <section className="relative border-y border-border/50 bg-muted/30 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-12 lg:grid-cols-3">
              <div>
                <div className="mb-2 text-5xl font-semibold tracking-tight text-foreground">$2.4M</div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Average cost per hallucination incident in regulated industries
                </p>
              </div>
              <div>
                <div className="mb-2 text-5xl font-semibold tracking-tight text-foreground">78%</div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Of enterprises now deploy AI in production systems
                </p>
              </div>
              <div>
                <div className="mb-2 text-5xl font-semibold tracking-tight text-foreground">100%</div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Legally liable for every AI-generated output
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                One method doesn&apos;t fit all use cases
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground">
                Existing solutions lock you into a single approach. Medical AI needs different verification than customer support.
              </p>
            </div>

            <div className="mt-16 grid gap-8 lg:grid-cols-2">
              {/* Traditional */}
              <div className="rounded-2xl border border-border/60 bg-card p-8">
                <div className="mb-6 inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  Traditional approach
                </div>
                <h3 className="mb-4 text-xl font-semibold">Single method verification</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                    Fixed weights across all domains
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                    Domain-specific solutions only
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                    One-size-fits-all tradeoffs
                  </li>
                </ul>
              </div>

              {/* Check */}
              <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-8">
                <div className="mb-6 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Check&apos;s approach
                </div>
                <h3 className="mb-4 text-xl font-semibold">Seven configurable methods</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-primary" />
                    Custom weights per use case
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-primary" />
                    Universal coverage, any domain
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-primary" />
                    Tune speed vs. accuracy tradeoffs
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* The 7 Methods */}
        <section className="border-t border-border/50 bg-muted/20 py-20 lg:py-28" id="methods">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-16">
              <h2 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Seven verification methods
              </h2>
              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                Mix and match based on your use case. Each method has different speed-accuracy tradeoffs.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <MethodCard
                icon={<Zap className="h-5 w-5" />}
                title="Semantic Similarity"
                description="Quick embedding comparison for initial filtering"
                speed="~100ms"
                fpr="50-100%"
              />
              <MethodCard
                icon={<Activity className="h-5 w-5" />}
                title="Reasoning-Based"
                description="Chain-of-thought analysis for general verification"
                speed="2-3s"
                fpr="7%"
              />
              <MethodCard
                icon={<Code className="h-5 w-5" />}
                title="Tool-Augmented"
                description="Web search and code execution for facts"
                speed="1-2s"
                fpr="~2%"
              />
              <MethodCard
                icon={<Shield className="h-5 w-5" />}
                title="BiPRM"
                description="Bidirectional reasoning for high-stakes domains"
                speed="3-5s"
                fpr="~10%"
              />
              <MethodCard
                icon={<BarChart className="h-5 w-5" />}
                title="Ensemble"
                description="Multiple model voting for precision"
                speed="5-10s"
                fpr="20-40%"
              />
              <MethodCard
                icon={<CheckCircle className="h-5 w-5" />}
                title="Semantic Entropy"
                description="Multi-sample consistency analysis"
                speed="~200ms"
                fpr="~15%"
              />
              <MethodCard
                icon={<FileText className="h-5 w-5" />}
                title="Formal Verification"
                description="Mathematical proofs for cryptography"
                speed="Variable"
                fpr="0%"
                badge="Soon"
              />
            </div>
          </div>
        </section>

        {/* Developer Experience */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <h2 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Developer-friendly API
                </h2>
                <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
                  Simple REST API that fits your workflow. Send a request, get a verdict.
                </p>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Code className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mb-1 text-sm font-medium">RESTful API</h3>
                    <p className="text-sm text-muted-foreground">Standard HTTP with JSON responses</p>
                  </div>
                  <div>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mb-1 text-sm font-medium">Clear Docs</h3>
                    <p className="text-sm text-muted-foreground">Python, Node.js, and cURL</p>
                  </div>
                  <div>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mb-1 text-sm font-medium">Fast Integration</h3>
                    <p className="text-sm text-muted-foreground">Under 10 lines of code</p>
                  </div>
                  <div>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mb-1 text-sm font-medium">Type-Safe SDKs</h3>
                    <p className="text-sm text-muted-foreground">Full TypeScript support</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Request</div>
                  <pre className="overflow-hidden rounded-xl border border-border bg-muted/50 p-5 font-mono text-sm">
                    <code className="text-foreground">{`{
  "content": "Patient should
    take 500mg aspirin daily",
  "methods": {
    "reasoning": 0.5,
    "tool": 0.3,
    "biprm": 0.2
  }
}`}</code>
                  </pre>
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Response</div>
                  <pre className="overflow-hidden rounded-xl border border-destructive/20 bg-destructive/5 p-5 font-mono text-sm">
                    <code className="text-foreground">{`{
  "verdict": "false",
  "confidence": 0.94,
  "decision": "reject",
  "reasoning": "Dosage exceeds
    safe limits (max 325mg)"
}`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="border-t border-border/50 bg-muted/20 py-20 lg:py-28" id="pricing">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Transparent pricing
              </h2>
              <p className="mx-auto max-w-lg text-lg text-muted-foreground">
                Bring your own API keys. No token markups. Just platform access.
              </p>
            </div>

            <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-3">
              {/* Free */}
              <div className="flex flex-col rounded-2xl border border-border/60 bg-card p-6">
                <div className="mb-6">
                  <div className="mb-1 text-sm font-medium text-muted-foreground">Free</div>
                  <div className="text-4xl font-semibold tracking-tight">$0</div>
                </div>
                <ul className="mb-8 flex-1 space-y-3 text-sm">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-primary" />
                    <span>100 verifications/month</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Semantic method only</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-primary" />
                    <span>10 req/min rate limit</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-primary" />
                    <span>API access</span>
                  </li>
                </ul>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/signup">Get started</Link>
                </Button>
              </div>

              {/* Pro - Featured */}
              <div className="relative flex flex-col rounded-2xl border-2 border-primary bg-card p-6 shadow-lg shadow-primary/10">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Most popular
                  </span>
                </div>
                <div className="mb-6">
                  <div className="mb-1 text-sm font-medium text-primary">Pro</div>
                  <div className="text-4xl font-semibold tracking-tight">$99-299</div>
                  <div className="text-sm text-muted-foreground">/month</div>
                </div>
                <ul className="mb-8 flex-1 space-y-3 text-sm">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-primary" />
                    <span><strong>5,000</strong> verifications/month</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-primary" />
                    <span>All 7 verification methods</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Custom weight configuration</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Bring your own API keys</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-primary" />
                    <span>100 req/min rate limit</span>
                  </li>
                </ul>
                <Button asChild className="w-full">
                  <Link href="/signup">Subscribe</Link>
                </Button>
              </div>

              {/* Enterprise */}
              <div className="flex flex-col rounded-2xl border border-border/60 bg-card p-6">
                <div className="mb-6">
                  <div className="mb-1 text-sm font-medium text-muted-foreground">Enterprise</div>
                  <div className="text-4xl font-semibold tracking-tight">Custom</div>
                </div>
                <ul className="mb-8 flex-1 space-y-3 text-sm">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Unlimited verifications</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-primary" />
                    <span>1,000 req/min rate limit</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Custom SLAs</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-primary" />
                    <span>White-label options</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Dedicated support</span>
                  </li>
                </ul>
                <Button variant="outline" asChild className="w-full">
                  <Link href="mailto:sales@checkapi.ai">Contact sales</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-6">
            <div className="relative overflow-hidden rounded-3xl bg-foreground px-8 py-16 text-center lg:px-16 lg:py-20">
              {/* Gradient orb */}
              <div className="bg-cta-glow pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[100px]" />

              <div className="relative">
                <h2 className="mb-4 text-3xl font-semibold tracking-tight text-background sm:text-4xl">
                  Get started today
                </h2>
                <p className="mx-auto mb-8 max-w-md text-lg text-background/70">
                  Start verifying your AI outputs in minutes. No credit card required.
                </p>

                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button size="lg" className="bg-background text-foreground hover:bg-background/90" asChild>
                    <Link href="/signup">Create free account</Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-background/20 bg-background/10 text-background hover:bg-background/20"
                    asChild
                  >
                    <Link href="/login">Log in</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Check" width={20} height={20} />
            <span className="text-sm text-muted-foreground">© 2026 Check</span>
          </div>
          <nav className="flex gap-6 sm:ml-auto">
            <a
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              href="https://arxiv.org/abs/2512.15068"
              target="_blank"
              rel="noopener noreferrer"
            >
              Research
            </a>
            <Link
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              href="/docs"
            >
              Docs
            </Link>
            <Link
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              href="/terms"
            >
              Terms
            </Link>
            <Link
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              href="/privacy"
            >
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

// Method Card Component
function MethodCard({
  icon,
  title,
  description,
  speed,
  fpr,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  speed: string;
  fpr: string;
  badge?: string;
}) {
  return (
    <div className="group rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-border hover:shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </div>
      <h3 className="mb-2 font-medium">{title}</h3>
      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{speed}</span>
        <span className="text-xs text-muted-foreground">•</span>
        <span className="text-xs text-muted-foreground">FPR: {fpr}</span>
        {badge && (
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
