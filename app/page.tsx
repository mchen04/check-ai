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
import {
  AlertCircle,
  Shield,
  Zap,
  Code,
  Activity,
  BarChart,
  FileText,
  CheckCircle,
  XCircle,
  Check,
  X,
} from 'lucide-react';
import Stripe from 'stripe';
import NeuralNetwork from '@/components/neural-network';
import UseCaseCarousel from '@/components/use-case-carousel';

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
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="content-wrapper">
          <div className="content-constrained flex h-20 items-center px-6">
            <Link className="flex items-center gap-3" href="#">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold tracking-tight">VerifyAI</span>
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
            <Button asChild size="sm" className="ml-8">
              <Link href="#waitlist">Join Beta</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section - White */}
        <section className="bg-section-white relative w-full overflow-x-clip !pt-8 lg:!pt-12">
          {/* Background gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent"></div>
          <div className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] bg-gradient-to-br from-primary/10 via-accent-cyan/5 to-transparent blur-3xl"></div>

          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col items-center gap-y-16">
              {/* Left: Text Content - Columns 1-2 */}
              <div className="relative z-10 col-1-2 space-y-8">
                <div className="status-badge">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                  </span>
                  <span className="font-medium">Now in Beta</span>
                </div>

                <div className="space-y-6">
                  <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                    Your AI outputs cost you{' '}
                    <span className="relative inline-block">
                      <span className="relative z-10">$2.4M</span>
                      <span className="absolute -inset-1 -z-10 bg-primary/10 blur-lg"></span>
                    </span>{' '}
                    when they&apos;re wrong
                  </h1>
                  <p className="max-w-xl text-base leading-relaxed text-muted-foreground lg:text-lg">
                    Catch hallucinations before deployment with seven research-backed verification
                    methods. Configure the mix that fits your use case—medical, legal, or anything in
                    between.
                  </p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row">
                  <Button size="lg" className="text-base shadow-lg shadow-primary/20" asChild>
                    <Link href="#waitlist">Join the beta</Link>
                  </Button>
                  <Button variant="outline" size="lg" className="text-base" asChild>
                    <Link href="#methods">See how it works</Link>
                  </Button>
                </div>

                {/* Trust indicator */}
                <div className="flex items-center gap-3 pt-4">
                  <div className="flex -space-x-2">
                    <div className="h-8 w-8 rounded-full border-2 border-background bg-primary/20"></div>
                    <div className="h-8 w-8 rounded-full border-2 border-background bg-primary/30"></div>
                    <div className="h-8 w-8 rounded-full border-2 border-background bg-primary/40"></div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">12 teams</span> in private beta
                  </p>
                </div>
              </div>

              {/* Right: API Example - Columns 3-4 + extends right */}
              <div className="relative z-20 col-3-4 extend-right">
                <div className="space-y-6">
                  {/* Request */}
                  <div>
                    <div className="mb-3">
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        REQUEST
                      </span>
                    </div>
                    <pre className="rounded-lg bg-muted/30 p-6 font-mono text-sm leading-relaxed">
                      <code className="text-foreground">{`{
  "content": "Patient should
    take 500mg aspirin
    daily",
  "methods": {
    "reasoning": 0.5,
    "tool": 0.3,
    "biprm": 0.2
  }
}`}</code>
                    </pre>
                  </div>

                  {/* Response */}
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-[3px] w-12 rounded-full bg-gradient-to-r from-destructive to-transparent"></div>
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        RESPONSE
                      </span>
                    </div>
                    <pre className="rounded-lg bg-destructive/5 p-6 font-mono text-sm leading-relaxed">
                      <code className="text-foreground">{`{
  "verdict": "false",
  "confidence": 0.94,
  "decision": "reject",
  "reasoning": "Dosage
    exceeds safe limits
    (max 325mg)"
}`}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem - Stats section */}
        <section className="diagonal-divider-both bg-section-navy relative w-full overflow-hidden">
          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-20">
              {/* Heading - Spans 1-2 */}
              <div className="col-1-2">
                <h2 className="mb-6 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  The stakes are higher than you think
                </h2>
                <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                  Even GPT-5 will have an 8% error rate. Zero hallucinations is mathematically
                  impossible—but you&apos;re legally liable for every output.
                </p>
              </div>

              {/* Visual element - Neural network particle animation */}
              <div className="col-3-4 relative row-span-2 min-h-[400px]">
                <div className="absolute inset-0 h-full w-full">
                  <NeuralNetwork
                    particleCount={80}
                    linkDistance={120}
                    particleColor="rgba(99, 91, 255, 0.6)"
                    linkColor="99, 91, 255"
                    particleSize={2.5}
                  />
                </div>
              </div>

              {/* Stats Grid - Aligned at same level with margin from heading */}
              <div className="col-1-3 mt-6 grid grid-cols-3 gap-8">
                <div>
                  <div className="mb-2 text-2xl font-bold tracking-tight">
                    $2.4M
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Average cost per hallucination incident in regulated industries
                  </p>
                </div>

                <div>
                  <div className="mb-2 text-2xl font-bold tracking-tight">
                    78%
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Of enterprises now deploy AI in production systems
                  </p>
                </div>

                <div>
                  <div className="mb-2 text-2xl font-bold tracking-tight">
                    100%
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Legally liable for every AI output your product generates
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Why Different - Editorial Typography Comparison */}
        <section className="diagonal-divider-both bg-section-white relative w-full overflow-hidden">
          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-24">
              {/* Heading - Spans 1-3 */}
              <div className="col-1-3">
                <h2 className="mb-6 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  One method doesn&apos;t fit all use cases
                </h2>
                <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                  Existing solutions lock you into a single approach. Medical AI needs different
                  verification than customer support. Legal AI needs different checks than
                  e-commerce.
                </p>
              </div>

              {/* Traditional - Column 1 with dramatic typography */}
              <div className="col-1 space-y-6">
                {/* Huge number showing limitation */}
                <div className="relative">
                  <div className="text-[120px] font-bold leading-none tracking-tighter text-destructive/10">
                    1
                  </div>
                  <div className="absolute bottom-2 left-0 text-xs font-bold uppercase tracking-widest text-destructive/60">
                    Traditional
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-semibold">Single method</h3>
                  <p className="text-sm text-muted-foreground">
                    Fixed weights
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Domain-specific
                  </p>
                  <p className="text-sm text-muted-foreground">
                    One-size-fits-all
                  </p>
                </div>
              </div>

              {/* VerifyAI - Columns 2-4 with contrasting scale */}
              <div className="col-2-4 space-y-6">
                {/* Huge number showing capability */}
                <div className="relative">
                  <div className="text-[120px] font-bold leading-none tracking-tighter text-primary/15">
                    7
                  </div>
                  <div className="absolute bottom-2 left-0 text-xs font-bold uppercase tracking-widest text-primary">
                    VerifyAI
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-semibold">Seven methods</h3>
                  <p className="text-sm text-muted-foreground">
                    Custom weights
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Universal coverage
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Configure per use case
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The 7 Methods - Icon grid like Stripe */}
        <section className="diagonal-divider-both bg-section-gray relative w-full overflow-hidden" id="methods">
          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-16">
              {/* Heading - Columns 1-2 */}
              <div className="col-1-2">
                <h2 className="mb-6 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  Seven verification methods
                </h2>
                <p className="text-base leading-relaxed text-muted-foreground">
                  Mix and match based on your use case. Each method has different speed-accuracy
                  tradeoffs.
                </p>
              </div>


              {/* Methods as simple list */}
              <div className="col-1">
                <Zap className="mb-3 h-5 w-5 text-primary" />
                <h3 className="mb-2 text-sm font-semibold">Semantic Similarity</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Quick embedding comparison for initial filtering
                </p>
                <div className="text-xs text-muted-foreground">~100ms • FPR: 50-100%</div>
              </div>

              <div className="col-2">
                <Activity className="mb-3 h-5 w-5 text-primary" />
                <h3 className="mb-2 text-sm font-semibold">Reasoning-Based</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Chain-of-thought analysis for general verification
                </p>
                <div className="text-xs text-muted-foreground">2-3s • FPR: 7%</div>
              </div>

              <div className="col-3">
                <Code className="mb-3 h-5 w-5 text-primary" />
                <h3 className="mb-2 text-sm font-semibold">Tool-Augmented</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Web search and code execution for facts
                </p>
                <div className="text-xs text-muted-foreground">1-2s • FPR: ~2%</div>
              </div>

              <div className="col-4">
                <Shield className="mb-3 h-5 w-5 text-primary" />
                <h3 className="mb-2 text-sm font-semibold">BiPRM</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Bidirectional reasoning for high-stakes domains
                </p>
                <div className="text-xs text-muted-foreground">3-5s • FPR: ~10%</div>
              </div>

              <div className="col-1">
                <BarChart className="mb-3 h-5 w-5 text-primary" />
                <h3 className="mb-2 text-sm font-semibold">Ensemble</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Multiple model voting for precision
                </p>
                <div className="text-xs text-muted-foreground">5-10s • FPR: 20-40%</div>
              </div>

              <div className="col-2">
                <CheckCircle className="mb-3 h-5 w-5 text-primary" />
                <h3 className="mb-2 text-sm font-semibold">Semantic Entropy</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Consistency pattern detection
                </p>
                <div className="text-xs text-muted-foreground">~200ms • FPR: TBD</div>
              </div>

              <div className="col-3">
                <FileText className="mb-3 h-5 w-5 text-primary" />
                <h3 className="mb-2 text-sm font-semibold">Formal Verification</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Mathematical proofs for cryptography and smart contracts
                </p>
                <div className="mb-2 text-xs text-muted-foreground">Variable • FPR: 0%</div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases - Configuration carousel */}
        <section className="diagonal-divider-both bg-section-white relative w-full overflow-hidden">
          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-12">
              {/* Heading - Columns 1-2 */}
              <div className="col-1-2">
                <h2 className="mb-6 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  Configure for your domain
                </h2>
                <p className="text-base leading-relaxed text-muted-foreground">
                  Different industries need different verification mixes. Here&apos;s how teams configure VerifyAI.
                </p>
              </div>

              {/* Carousel - Columns 3-4 */}
              <div className="col-3-4">
                <UseCaseCarousel />
              </div>
            </div>
          </div>
        </section>

        {/* Developer Experience - API & Documentation */}
        <section className="diagonal-divider-both bg-section-navy relative w-full overflow-hidden">
          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-16">
              {/* Heading and Features - Columns 1-2 */}
              <div className="col-1-2 space-y-12">
                <div>
                  <h2 className="mb-6 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                    Developer-friendly API
                  </h2>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    Simple REST API that fits your workflow. Send a request, get a verdict—no complex setup required.
                  </p>
                </div>

                {/* Features in 2 columns within col-1-2 */}
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Code className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mb-2 text-sm font-semibold text-white">RESTful API</h3>
                    <p className="text-xs text-white/70">
                      Standard HTTP requests with JSON responses
                    </p>
                  </div>

                  <div>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mb-2 text-sm font-semibold text-white">Clear Documentation</h3>
                    <p className="text-xs text-white/70">
                      Code examples in Python, Node.js, and cURL
                    </p>
                  </div>

                  <div>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mb-2 text-sm font-semibold text-white">Fast Integration</h3>
                    <p className="text-xs text-white/70">
                      Add verification in under 10 lines of code
                    </p>
                  </div>

                  <div>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mb-2 text-sm font-semibold text-white">Type-Safe SDKs</h3>
                    <p className="text-xs text-white/70">
                      Full TypeScript support with autocomplete
                    </p>
                  </div>
                </div>
              </div>

              {/* API Example - Columns 3-4 */}
              <div className="col-3-4">
                <div className="space-y-6">
                  {/* Request */}
                  <div>
                    <div className="mb-3">
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white/60">
                        REQUEST
                      </span>
                    </div>
                    <pre className="rounded-lg bg-white/5 p-6 font-mono text-sm leading-relaxed">
                      <code className="text-white">{`{
  "content": "Patient should
    take 500mg aspirin
    daily",
  "methods": {
    "reasoning": 0.5,
    "tool": 0.3,
    "biprm": 0.2
  }
}`}</code>
                    </pre>
                  </div>

                  {/* Response */}
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-[3px] w-12 rounded-full bg-gradient-to-r from-destructive to-transparent"></div>
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white/60">
                        RESPONSE
                      </span>
                    </div>
                    <pre className="rounded-lg bg-destructive/10 p-6 font-mono text-sm leading-relaxed">
                      <code className="text-white">{`{
  "verdict": "false",
  "confidence": 0.94,
  "decision": "reject",
  "reasoning": "Dosage
    exceeds safe limits
    (max 325mg)"
}`}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="diagonal-divider-both bg-section-white relative w-full overflow-hidden" id="pricing">

          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-16">
              {/* Heading - Full width */}
              <div className="col-1-4">
                <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  Transparent pricing
                </h2>
                <p className="mb-8 max-w-2xl text-base leading-relaxed text-muted-foreground">
                  Bring your own API keys. No token markups. Just platform access.
                </p>
              </div>

              {/* Pricing cards - evenly split across 4 columns */}
              <div className="col-1-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Free */}
                <div className="flex flex-col rounded-xl border border-border bg-card p-6">
                  <div className="mb-6">
                    <div className="mb-1 text-4xl font-bold">$0</div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Free</h3>
                  </div>
                  <ul className="mb-8 flex-1 space-y-3 text-sm">
                    <li className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>100 verifications</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>Semantic method</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>API access</span>
                    </li>
                  </ul>
                  <Button variant="outline" size="default" asChild className="w-full">
                    <Link href="#waitlist">Join beta</Link>
                  </Button>
                </div>

                {/* Pro */}
                <div className="flex flex-col rounded-xl border border-border bg-card p-6">
                  <div className="mb-6">
                    <div className="mb-4 inline-flex rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
                      Most Popular
                    </div>
                    <div className="mb-1 text-4xl font-bold">$99-299</div>
                    <div className="mb-1 text-sm text-muted-foreground">/month</div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pro</h3>
                  </div>

                  <ul className="mb-8 flex-1 space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span><strong>Unlimited</strong> verifications</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>All 7 verification methods</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>Custom weight configuration</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>Bring your own API keys (no markup)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>Priority support</span>
                    </li>
                  </ul>

                  <Button asChild className="w-full" size="default">
                    <Link href="#waitlist">Join beta</Link>
                  </Button>
                </div>

                {/* Enterprise */}
                <div className="flex flex-col rounded-xl border border-border bg-card p-6">
                  <div className="mb-6">
                    <div className="mb-1 text-4xl font-bold">Custom</div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Enterprise</h3>
                  </div>
                  <ul className="mb-8 flex-1 space-y-3 text-sm">
                    <li className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>Everything in Pro</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>Custom SLAs</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>White-label options</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>Custom methods</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>Dedicated support</span>
                    </li>
                  </ul>
                  <Button variant="outline" size="default" asChild className="w-full">
                    <Link href="#waitlist">Contact sales</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section / Waitlist - Dark navy Stripe style */}
        <section className="bg-section-navy relative w-full overflow-hidden" id="waitlist">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-cyan/10 via-transparent to-accent-purple/10"></div>
          <div className="parallax-slow pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl"></div>
          <div className="parallax-slow pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-accent-cyan/20 blur-3xl" style={{animationDelay: '-10s'}}></div>

          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-12">
              {/* Main CTA - Columns 2-3 (centered) */}
              <div className="col-2-3">
                <div className="relative text-center">
                  <h2 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                    Join the beta
                  </h2>
                  <p className="mb-12 text-base text-white/60">
                    We&apos;re working with design partners in healthcare, legal, and finance to
                    validate our approach.
                  </p>

                  <div className="mb-10 flex flex-col gap-4 sm:flex-row">
                    <input
                      type="email"
                      placeholder="you@company.com"
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-6 py-4 text-base text-white backdrop-blur-sm placeholder:text-white/40 focus-visible:border-white/30 focus-visible:outline-none focus-visible:ring-0"
                    />
                    <Button size="lg" className="bg-white text-foreground hover:bg-white/90 sm:w-auto">
                      Join waitlist
                    </Button>
                  </div>

                  {/* Benefits - Simple horizontal badges */}
                  <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-white/80">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      <span>Extended free tier</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      <span>Shape the product</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      <span>Lock in beta pricing</span>
                    </div>
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
            <p className="text-sm text-muted-foreground">© 2025 VerifyAI</p>
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
                href="#"
              >
                Terms
              </Link>
              <Link
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                href="#"
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
