import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Shield, Zap, Code, Activity, BarChart, FileText, Check, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Stripe from 'stripe';
import NeuralNetwork from '@/components/neural-network';
import UseCaseCarousel from '@/components/use-case-carousel';
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
    <div className="relative flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="content-wrapper">
          <div className="content-constrained flex h-16 items-center px-6">
            <Link className="flex items-center gap-2.5" href="#">
              <Image src="/logo.svg" alt="Check logo" width={32} height={32} />
              <span className="text-lg font-semibold">Check</span>
            </Link>
            <nav className="ml-auto hidden items-center gap-8 md:flex">
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
            </nav>
            <div className="ml-8 flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full overflow-hidden pb-20 pt-12 lg:pb-32 lg:pt-20">
          {/* Subtle gradient background */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background to-background-alt"></div>
          <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/4 translate-x-1/4 rounded-full bg-primary/5 blur-3xl"></div>

          <div className="content-wrapper">
            <div className="content-constrained grid-4col items-center gap-y-16">
              {/* Left: Text Content */}
              <div className="col-1-2 relative z-10 space-y-8">
                <div className="space-y-5">
                  <h1 className="text-4xl font-semibold leading-[1.1] sm:text-5xl lg:text-6xl">
                    Your AI outputs cost you{' '}
                    <span className="text-primary">$2.4M</span>{' '}
                    when they&apos;re wrong
                  </h1>
                  <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
                    Catch hallucinations before deployment with seven research-backed verification
                    methods. Configure the mix for your use case.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/signup">Get started free</Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link href="#methods">See how it works</Link>
                  </Button>
                </div>
              </div>

              {/* Right: Dashboard Preview */}
              <div className="col-3-4 extend-right relative z-20 flex min-h-[400px] items-center">
                <div className="absolute left-[20%] top-1/2 w-[130%] -translate-y-1/2">
                  <HeroDashboard />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem - Stats section */}
        <section className="bg-section-dark relative w-full overflow-hidden">
          <div className="content-wrapper">
            <div className="content-constrained grid-4col gap-y-16">
              {/* Heading */}
              <div className="col-1-2">
                <h2 className="mb-5 text-3xl font-semibold sm:text-4xl lg:text-5xl">
                  The stakes are higher than you think
                </h2>
                <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
                  Even GPT-5 will have an 8% error rate. Zero hallucinations is mathematically
                  impossible—but you&apos;re legally liable for every output.
                </p>
              </div>

              {/* Neural network animation */}
              <div className="col-3-4 relative row-span-2 min-h-[350px]">
                <div className="absolute inset-0 h-full w-full opacity-80">
                  <NeuralNetwork
                    particleCount={60}
                    linkDistance={100}
                    particleColor="rgba(139, 92, 246, 0.5)"
                    linkColor="139, 92, 246"
                    particleSize={2}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="col-1-3 grid grid-cols-3 gap-8">
                <div>
                  <div className="mb-2 text-3xl font-semibold text-white">$2.4M</div>
                  <p className="text-sm text-muted-foreground">
                    Average cost per hallucination in regulated industries
                  </p>
                </div>

                <div>
                  <div className="mb-2 text-3xl font-semibold text-white">78%</div>
                  <p className="text-sm text-muted-foreground">
                    Of enterprises deploy AI in production systems
                  </p>
                </div>

                <div>
                  <div className="mb-2 text-3xl font-semibold text-white">100%</div>
                  <p className="text-sm text-muted-foreground">
                    Legally liable for every AI output generated
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Different - Editorial Typography Comparison */}
        <section className="bg-section-white relative w-full overflow-hidden">
          <div className="content-wrapper">
            <div className="content-constrained grid-4col gap-y-20">
              {/* Heading */}
              <div className="col-1-3">
                <h2 className="mb-5 text-3xl font-semibold sm:text-4xl lg:text-5xl">
                  One method doesn&apos;t fit all use cases
                </h2>
                <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                  Existing solutions lock you into a single approach. Medical AI needs different
                  verification than customer support.
                </p>
              </div>

              {/* Traditional */}
              <div className="col-1 space-y-4">
                <div className="relative">
                  <div className="text-[100px] font-semibold leading-none text-muted-foreground/10">
                    1
                  </div>
                  <div className="absolute bottom-1 left-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Traditional
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Single method</h3>
                  <p className="text-sm text-muted-foreground">Fixed weights</p>
                  <p className="text-sm text-muted-foreground">Domain-specific</p>
                  <p className="text-sm text-muted-foreground">One-size-fits-all</p>
                </div>
              </div>

              {/* Check */}
              <div className="col-2-4 space-y-4">
                <div className="relative">
                  <div className="text-[100px] font-semibold leading-none text-primary/10">
                    7
                  </div>
                  <div className="absolute bottom-1 left-0 text-xs font-medium uppercase tracking-wider text-primary">
                    Check
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Seven methods</h3>
                  <p className="text-sm text-muted-foreground">Custom weights</p>
                  <p className="text-sm text-muted-foreground">Universal coverage</p>
                  <p className="text-sm text-muted-foreground">Configure per use case</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The 7 Methods */}
        <section className="bg-section-gray relative w-full overflow-hidden" id="methods">
          <div className="content-wrapper">
            <div className="content-constrained grid-4col gap-y-12">
              {/* Heading */}
              <div className="col-1-2">
                <h2 className="mb-4 text-3xl font-semibold sm:text-4xl lg:text-5xl">
                  Seven verification methods
                </h2>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Mix and match based on your use case. Each method has different speed-accuracy
                  tradeoffs.
                </p>
              </div>

              {/* Methods grid */}
              <div className="col-1">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-medium">Semantic Similarity</h3>
                <p className="mb-2 text-sm text-muted-foreground">
                  Quick embedding comparison for initial filtering
                </p>
                <p className="text-xs text-muted-foreground/70">~100ms • FPR: 50-100%</p>
              </div>

              <div className="col-2">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-medium">Reasoning-Based</h3>
                <p className="mb-2 text-sm text-muted-foreground">
                  Chain-of-thought analysis for general verification
                </p>
                <p className="text-xs text-muted-foreground/70">2-3s • FPR: 7%</p>
              </div>

              <div className="col-3">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Code className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-medium">Tool-Augmented</h3>
                <p className="mb-2 text-sm text-muted-foreground">
                  Web search and code execution for facts
                </p>
                <p className="text-xs text-muted-foreground/70">1-2s • FPR: ~2%</p>
              </div>

              <div className="col-4">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-medium">BiPRM</h3>
                <p className="mb-2 text-sm text-muted-foreground">
                  Bidirectional reasoning for high-stakes domains
                </p>
                <p className="text-xs text-muted-foreground/70">3-5s • FPR: ~10%</p>
              </div>

              <div className="col-1">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <BarChart className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-medium">Ensemble</h3>
                <p className="mb-2 text-sm text-muted-foreground">
                  Multiple model voting for precision
                </p>
                <p className="text-xs text-muted-foreground/70">5-10s • FPR: 20-40%</p>
              </div>

              <div className="col-2">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-medium">Semantic Entropy</h3>
                <p className="mb-2 text-sm text-muted-foreground">
                  Multi-sample consistency analysis
                </p>
                <p className="text-xs text-muted-foreground/70">~200ms • FPR: ~15%</p>
              </div>

              <div className="col-3">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-medium">Formal Verification</h3>
                <p className="mb-2 text-sm text-muted-foreground">
                  Mathematical proofs for cryptography
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground/70">Variable • FPR: 0%</p>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Soon
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="bg-section-white relative w-full overflow-hidden">
          <div className="content-wrapper">
            <div className="content-constrained grid-4col gap-y-12">
              <div className="col-1-2">
                <h2 className="mb-4 text-3xl font-semibold sm:text-4xl lg:text-5xl">
                  Configure for your domain
                </h2>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Different industries need different verification mixes. Here&apos;s how teams
                  configure Check.
                </p>
              </div>

              <div className="col-3-4">
                <UseCaseCarousel />
              </div>
            </div>
          </div>
        </section>

        {/* Developer Experience */}
        <section className="bg-section-dark relative w-full overflow-hidden">
          <div className="content-wrapper">
            <div className="content-constrained grid-4col gap-y-12">
              <div className="col-1-2 space-y-10">
                <div>
                  <h2 className="mb-4 text-3xl font-semibold sm:text-4xl lg:text-5xl">
                    Developer-friendly API
                  </h2>
                  <p className="text-lg leading-relaxed text-muted-foreground">
                    Simple REST API that fits your workflow. Send a request, get a verdict.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                      <Code className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="mb-1.5 text-sm font-medium text-white">RESTful API</h3>
                    <p className="text-sm text-white/60">
                      Standard HTTP with JSON responses
                    </p>
                  </div>

                  <div>
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="mb-1.5 text-sm font-medium text-white">Clear Docs</h3>
                    <p className="text-sm text-white/60">
                      Python, Node.js, and cURL examples
                    </p>
                  </div>

                  <div>
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="mb-1.5 text-sm font-medium text-white">Fast Integration</h3>
                    <p className="text-sm text-white/60">
                      Under 10 lines of code
                    </p>
                  </div>

                  <div>
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="mb-1.5 text-sm font-medium text-white">Type-Safe SDKs</h3>
                    <p className="text-sm text-white/60">
                      Full TypeScript support
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-3-4">
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 font-mono text-xs uppercase tracking-wider text-white/50">Request</p>
                    <pre className="overflow-hidden rounded-xl border border-white/10 bg-white/5 p-5 font-mono text-sm">
                      <code className="text-white/90">{`{
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
                    <p className="mb-2 font-mono text-xs uppercase tracking-wider text-white/50">Response</p>
                    <pre className="overflow-hidden rounded-xl border border-destructive/20 bg-destructive/10 p-5 font-mono text-sm">
                      <code className="text-white/90">{`{
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
          </div>
        </section>

        {/* Pricing Section */}
        <section className="bg-section-white relative w-full overflow-hidden" id="pricing">
          <div className="content-wrapper">
            <div className="content-constrained grid-4col gap-y-12">
              <div className="col-1-4">
                <h2 className="mb-4 text-3xl font-semibold sm:text-4xl lg:text-5xl">
                  Transparent pricing
                </h2>
                <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                  Bring your own API keys. No token markups. Just platform access.
                </p>
              </div>

              {/* Pricing cards */}
              <div className="col-1-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Free */}
                <div className="flex flex-col rounded-2xl border border-border/60 bg-card p-6 transition-shadow hover:shadow-md">
                  <div className="mb-5">
                    <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                      Free
                    </h3>
                    <div className="text-4xl font-semibold">$0</div>
                  </div>
                  <ul className="mb-6 flex-1 space-y-3 text-sm">
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

                {/* Pro */}
                <div className="flex flex-col rounded-2xl border-2 border-primary/20 bg-card p-6 ring-1 ring-primary/10 transition-shadow hover:shadow-md">
                  <div className="mb-5">
                    <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-primary">
                      Pro
                    </h3>
                    <div className="text-4xl font-semibold">$99-299</div>
                    <p className="text-sm text-muted-foreground">/month</p>
                  </div>
                  <ul className="mb-6 flex-1 space-y-3 text-sm">
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
                <div className="flex flex-col rounded-2xl border border-border/60 bg-card p-6 transition-shadow hover:shadow-md">
                  <div className="mb-5">
                    <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                      Enterprise
                    </h3>
                    <div className="text-4xl font-semibold">Custom</div>
                  </div>
                  <ul className="mb-6 flex-1 space-y-3 text-sm">
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
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-section-dark relative w-full overflow-hidden">
          <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"></div>

          <div className="content-wrapper">
            <div className="content-constrained">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="mb-5 text-4xl font-semibold text-white sm:text-5xl">
                  Get started today
                </h2>
                <p className="mb-10 text-lg text-white/60">
                  Start verifying your AI outputs in minutes. No credit card required.
                </p>

                <div className="mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button size="lg" className="bg-white text-neutral-900 hover:bg-white/90" asChild>
                    <Link href="/signup">Create free account</Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                    asChild
                  >
                    <Link href="/login">Log in</Link>
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    <span>100 free verifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    <span>No credit card</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    <span>API access</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t">
        <div className="content-wrapper">
          <div className="content-constrained flex flex-col items-center gap-6 px-6 py-12 sm:flex-row">
            <p className="text-sm text-muted-foreground">© 2026 Check</p>
            <nav className="flex gap-8 sm:ml-auto">
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
        </div>
      </footer>
    </div>
  );
}
