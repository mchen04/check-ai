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
        {/* Hero Section - White with subtle gradient */}
        <section className="bg-section-white relative w-full overflow-x-clip pb-32 pt-8 md:pb-40 md:pt-12 lg:pb-48 lg:pt-16">
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
                  <h1 className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
                    Your AI outputs cost you{' '}
                    <span className="relative inline-block">
                      <span className="relative z-10">$2.4M</span>
                      <span className="absolute -inset-1 -z-10 bg-primary/10 blur-lg"></span>
                    </span>{' '}
                    when they&apos;re wrong
                  </h1>
                  <p className="max-w-xl text-lg leading-relaxed text-muted-foreground lg:text-xl">
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
                {/* Glow effect */}
                <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent opacity-40 blur-3xl"></div>

                {/* Main card */}
                <div className="card-float depth-3 relative rounded-2xl border border-border/50 bg-card/95 p-8 backdrop-blur-md">
                  {/* Terminal header */}
                  <div className="mb-6 flex items-center gap-3 border-b border-border/50 pb-4">
                    <div className="flex gap-2">
                      <div className="h-3 w-3 rounded-full bg-gradient-to-br from-red-400 to-red-500"></div>
                      <div className="h-3 w-3 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500"></div>
                      <div className="h-3 w-3 rounded-full bg-gradient-to-br from-green-400 to-green-500"></div>
                    </div>
                    <span className="font-mono text-sm font-medium text-muted-foreground">POST /v1/verify</span>
                  </div>

                  <div className="space-y-6">
                    {/* Request */}
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="accent-bar"></div>
                        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          REQUEST
                        </span>
                      </div>
                      <pre className="rounded-lg border border-border/50 bg-muted/30 p-6 font-mono text-sm leading-relaxed">
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
                      <pre className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 font-mono text-sm leading-relaxed">
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
          </div>
        </section>

        {/* Problem - Stats section */}
        <section className="diagonal-divider-top bg-section-gray relative w-full overflow-hidden py-24 md:py-32">
          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-20">
              {/* Heading - Spans 1-3 for asymmetry */}
              <div className="col-1-3">
                <div className="mb-3 inline-block">
                  <div className="accent-bar"></div>
                </div>
                <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  The stakes are higher than you think
                </h2>
                <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  Even GPT-5 will have an 8% error rate. Zero hallucinations is mathematically
                  impossible—but you&apos;re legally liable for every output.
                </p>
              </div>

              {/* Visual indicator - Column 4 */}
              <div className="col-4">
                <div className="depth-2 relative rounded-xl border bg-card p-6">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Error Rate
                  </div>
                  <div className="mb-4 text-4xl font-bold">8%</div>
                  <div className="space-y-2">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full w-[8%] rounded-full bg-gradient-to-r from-destructive to-destructive/60"></div>
                    </div>
                    <p className="text-xs text-muted-foreground">Even with GPT-5</p>
                  </div>
                </div>
              </div>

              {/* Stats Grid - Simple clean numbers */}
              <div className="col-1">
                <div className="mb-5 text-6xl font-bold tracking-tight md:text-7xl">
                  $2.4M
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Average cost per hallucination incident in regulated industries
                </p>
              </div>

              <div className="col-2">
                <div className="mb-5 text-6xl font-bold tracking-tight md:text-7xl">
                  78%
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Of enterprises now deploy AI in production systems
                </p>
              </div>

              <div className="col-3">
                <div className="mb-5 text-6xl font-bold tracking-tight md:text-7xl">
                  100%
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Legally liable for every AI output your product generates
                </p>
              </div>

              {/* Case study - Column 4 with distinct styling */}
              <div className="col-4">
                <div className="depth-2 relative overflow-hidden rounded-xl border-l-4 border-primary bg-gradient-to-br from-primary/5 to-transparent p-6 hover-lift">
                  <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/5 blur-2xl"></div>
                  <div className="relative">
                    <div className="mb-4 text-5xl font-bold leading-none text-primary/20">&ldquo;</div>
                    <p className="text-sm leading-relaxed">
                      Air Canada was sued after their chatbot invented a refund policy.{' '}
                      <span className="font-semibold text-foreground">
                        Verification isn&apos;t optional anymore.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Different - Comparison with visual meters */}
        <section className="bg-section-white relative w-full overflow-hidden py-24 md:py-32">

          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-16">
              {/* Heading - Full width */}
              <div className="col-1-4">
                <div className="mb-3 inline-block">
                  <div className="accent-bar"></div>
                </div>
                <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  One method doesn&apos;t fit all use cases
                </h2>
                <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
                  Existing solutions lock you into a single approach. Medical AI needs different
                  verification than customer support. Legal AI needs different checks than
                  e-commerce.
                </p>
              </div>

              {/* Traditional - Column 1 with visual meter */}
              <div className="col-1">
                <div className="relative overflow-hidden rounded-xl border-2 border-destructive/30 bg-card p-6">
                  <div className="absolute right-0 top-0 h-full w-2 bg-gradient-to-b from-destructive/40 via-destructive/20 to-transparent"></div>
                  <div className="mb-5 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-destructive"></div>
                    <span className="text-xs font-bold uppercase tracking-widest text-destructive">
                      Traditional
                    </span>
                  </div>

                  {/* Visual limitation meter */}
                  <div className="mb-6 rounded-lg bg-destructive/5 p-4">
                    <div className="mb-3 text-xs font-semibold text-muted-foreground">Method Coverage</div>
                    <div className="h-8 overflow-hidden rounded-full bg-muted">
                      <div className="flex h-full w-[14%] items-center justify-center rounded-full bg-destructive text-xs font-bold text-white">
                        1
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Limited to 1 method</p>
                  </div>

                  <ul className="stagger-fade space-y-3">
                    <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                      <span>Locked approach</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                      <span>Domain-specific</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* VerifyAI - Columns 2-4 with icon grid */}
              <div className="col-2-4 depth-3 spotlight relative overflow-hidden rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/8 via-card to-accent-cyan/5 p-8 hover-lift">
                <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-primary/20 to-accent-cyan/20 blur-3xl"></div>
                <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-br from-accent-purple/10 to-transparent blur-3xl"></div>

                <div className="relative">
                  <div className="mb-8 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent"></div>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">
                      VerifyAI Platform
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-l from-primary/40 to-transparent"></div>
                  </div>

                  {/* Visual method coverage meter */}
                  <div className="mb-8 rounded-lg border border-primary/20 bg-primary/5 p-6">
                    <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Method Coverage</div>
                    <div className="h-10 overflow-hidden rounded-full bg-muted">
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-primary via-accent-cyan to-accent-purple text-sm font-bold text-white">
                        7 Methods Available
                      </div>
                    </div>
                  </div>

                  <div className="stagger-fade grid gap-6 sm:grid-cols-3">
                    <div className="group flex flex-col gap-3 rounded-lg border border-primary/10 bg-card/50 p-4 backdrop-blur-sm transition-all hover:border-primary/30">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent-cyan/20">
                        <Check className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="mb-1 font-semibold">7 Methods</div>
                        <p className="text-xs text-muted-foreground">Mix and match freely</p>
                      </div>
                    </div>
                    <div className="group flex flex-col gap-3 rounded-lg border border-primary/10 bg-card/50 p-4 backdrop-blur-sm transition-all hover:border-primary/30">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-accent-teal/20 to-accent-green/20">
                        <Check className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="mb-1 font-semibold">Custom Weights</div>
                        <p className="text-xs text-muted-foreground">Fine-tune per use case</p>
                      </div>
                    </div>
                    <div className="group flex flex-col gap-3 rounded-lg border border-primary/10 bg-card/50 p-4 backdrop-blur-sm transition-all hover:border-primary/30">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-accent-purple/20 to-primary/20">
                        <Check className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="mb-1 font-semibold">Universal</div>
                        <p className="text-xs text-muted-foreground">Works everywhere</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The 7 Methods - Icon grid like Stripe */}
        <section className="diagonal-divider-top bg-section-gray relative w-full overflow-hidden py-24 md:py-32" id="methods">
          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-16">
              {/* Heading - Columns 1-2 */}
              <div className="col-1-2">
                <div className="mb-3 inline-block">
                  <div className="accent-bar"></div>
                </div>
                <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  Seven verification methods
                </h2>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Mix and match based on your use case. Each method has different speed-accuracy
                  tradeoffs.
                </p>
              </div>

              {/* Stats preview - Columns 3-4 */}
              <div className="col-3-4">
                <div className="depth-2 rounded-xl border bg-card p-6">
                  <div className="mb-4 text-sm font-semibold">Popular Configurations</div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="mb-1 text-xs text-muted-foreground">Medical</div>
                        <div className="flex h-2 gap-1">
                          <div className="flex-[6] rounded-full bg-primary"></div>
                          <div className="flex-[3] rounded-full bg-primary/40"></div>
                          <div className="flex-[1] rounded-full bg-primary/20"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="mb-1 text-xs text-muted-foreground">Legal</div>
                        <div className="flex h-2 gap-1">
                          <div className="flex-1 rounded-full bg-primary"></div>
                          <div className="flex-1 rounded-full bg-primary"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Methods as icon grid - like Stripe's 4-card layout */}
              <div className="col-1">
                <div className="depth-1 group rounded-xl border bg-card p-6 transition-all hover:border-primary/30">
                  <Zap className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="mb-2 font-semibold">Semantic Similarity</h3>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Quick embedding comparison for initial filtering
                  </p>
                  <div className="text-xs text-muted-foreground">~100ms • FPR: 50-100%</div>
                </div>
              </div>

              <div className="col-2">
                <div className="depth-1 group rounded-xl border bg-card p-6 transition-all hover:border-primary/30">
                  <Activity className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="mb-2 font-semibold">Reasoning-Based</h3>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Chain-of-thought analysis for general verification
                  </p>
                  <div className="text-xs text-muted-foreground">2-3s • FPR: 7%</div>
                </div>
              </div>

              <div className="col-3">
                <div className="depth-1 group rounded-xl border bg-card p-6 transition-all hover:border-primary/30">
                  <Code className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="mb-2 font-semibold">Tool-Augmented</h3>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Web search and code execution for facts
                  </p>
                  <div className="text-xs text-muted-foreground">1-2s • FPR: ~2%</div>
                </div>
              </div>

              <div className="col-4">
                <div className="depth-1 group rounded-xl border bg-card p-6 transition-all hover:border-primary/30">
                  <Shield className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="mb-2 font-semibold">BiPRM</h3>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Bidirectional reasoning for high-stakes domains
                  </p>
                  <div className="text-xs text-muted-foreground">3-5s • FPR: ~10%</div>
                </div>
              </div>

              <div className="col-1">
                <div className="depth-1 group rounded-xl border bg-card p-6 transition-all hover:border-primary/30">
                  <BarChart className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="mb-2 font-semibold">Ensemble</h3>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Multiple model voting for precision
                  </p>
                  <div className="text-xs text-muted-foreground">5-10s • FPR: 20-40%</div>
                </div>
              </div>

              <div className="col-2">
                <div className="depth-1 group rounded-xl border bg-card p-6 transition-all hover:border-primary/30">
                  <CheckCircle className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="mb-2 font-semibold">Semantic Entropy</h3>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Consistency pattern detection
                  </p>
                  <div className="text-xs text-muted-foreground">~200ms • FPR: TBD</div>
                </div>
              </div>

              <div className="col-3-4">
                <div className="depth-2 group relative rounded-xl border-2 border-primary/20 bg-card p-6 transition-all hover:border-primary/30">
                  <div className="flex items-start gap-4">
                    <FileText className="h-8 w-8 flex-shrink-0 text-primary" />
                    <div>
                      <div className="mb-2 flex items-baseline gap-3">
                        <h3 className="font-semibold">Formal Verification</h3>
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          Coming Soon
                        </span>
                      </div>
                      <p className="mb-2 text-sm text-muted-foreground">
                        Mathematical proofs for cryptography and smart contracts
                      </p>
                      <div className="text-xs text-muted-foreground">Variable • FPR: 0%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases - Visual configuration display */}
        <section className="bg-section-white relative w-full py-24 md:py-32">

          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-12">
              {/* Heading - Columns 1-2 */}
              <div className="col-1-2">
                <div className="mb-3 inline-block">
                  <div className="accent-bar"></div>
                </div>
                <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                  Configure for your domain
                </h2>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Different industries need different verification mixes. Here&apos;s how teams configure VerifyAI.
                </p>
              </div>

              {/* Use cases as checklist displays - each unique */}
              {/* Medical AI - Columns 3-4 with checklist */}
              <div className="col-3-4">
                <div className="depth-1 rounded-xl border bg-card p-8">
                  <h3 className="mb-6 text-2xl font-bold">Medical AI</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-4">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">BiPRM verification</div>
                        <div className="text-xs text-muted-foreground">60% weight</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-4">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Tool-augmented check</div>
                        <div className="text-xs text-muted-foreground">30% weight</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-4">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Semantic filter</div>
                        <div className="text-xs text-muted-foreground">10% weight</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legal & Support - Columns 1-2 as pill badges */}
              <div className="col-1-2">
                <div className="depth-1 space-y-6 rounded-xl border bg-card p-8">
                  <div>
                    <h3 className="mb-4 text-xl font-bold">Legal AI</h3>
                    <div className="flex flex-wrap gap-2">
                      <div className="rounded-full border bg-muted px-4 py-2 text-sm">
                        <span className="font-medium">Ensemble</span>
                        <span className="ml-2 text-xs text-muted-foreground">50%</span>
                      </div>
                      <div className="rounded-full border bg-muted px-4 py-2 text-sm">
                        <span className="font-medium">Tool</span>
                        <span className="ml-2 text-xs text-muted-foreground">50%</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-6">
                    <h3 className="mb-4 text-xl font-bold">Support AI</h3>
                    <div className="flex flex-wrap gap-2">
                      <div className="rounded-full border bg-muted px-4 py-2 text-sm">
                        <span className="font-medium">Reasoning</span>
                        <span className="ml-2 text-xs text-muted-foreground">80%</span>
                      </div>
                      <div className="rounded-full border bg-muted px-4 py-2 text-sm">
                        <span className="font-medium">Semantic</span>
                        <span className="ml-2 text-xs text-muted-foreground">20%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Research Foundation - Connected timeline */}
        <section className="diagonal-divider-top bg-section-gray relative w-full overflow-hidden py-24 md:py-32">
          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-12">
              {/* Heading - Columns 1-2 */}
              <div className="col-1-2">
                <div className="mb-3 inline-block">
                  <div className="accent-bar"></div>
                </div>
                <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                  Backed by peer-reviewed research
                </h2>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Each method is grounded in published academic work, not speculation. Here are the key papers.
                </p>
              </div>

              {/* Research count - Columns 3-4 */}
              <div className="col-3-4">
                <div className="depth-2 rounded-xl border bg-card p-6">
                  <div className="mb-2 text-5xl font-bold">5</div>
                  <p className="text-sm text-muted-foreground">
                    Papers cited • All peer-reviewed
                  </p>
                </div>
              </div>

              {/* Research papers - Simple card list with link emphasis */}
              <div className="col-1-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="depth-1 rounded-lg border bg-card p-5 transition-all hover:border-primary/30">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mb-2 font-semibold">Semantic Illusion Problem</h3>
                    <a
                      href="https://arxiv.org/abs/2512.15068"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-2 inline-block font-mono text-xs text-primary hover:underline"
                    >
                      arxiv:2512.15068
                    </a>
                    <p className="text-sm text-muted-foreground">
                      50-100% FPR validates multi-method approach
                    </p>
                  </div>

                  <div className="depth-1 rounded-lg border bg-card p-5 transition-all hover:border-primary/30">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mb-2 font-semibold">FacTool</h3>
                    <a
                      href="https://arxiv.org/abs/2307.13528"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-2 inline-block font-mono text-xs text-primary hover:underline"
                    >
                      arxiv:2307.13528
                    </a>
                    <p className="text-sm text-muted-foreground">
                      98.97% F1 with tool verification
                    </p>
                  </div>

                  <div className="depth-1 rounded-lg border bg-card p-5 transition-all hover:border-primary/30">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mb-2 font-semibold">BiPRM Research</h3>
                    <a
                      href="https://arxiv.org/abs/2508.01682"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-2 inline-block font-mono text-xs text-primary hover:underline"
                    >
                      arxiv:2508.01682
                    </a>
                    <p className="text-sm text-muted-foreground">
                      31.9% accuracy improvement
                    </p>
                  </div>

                  <div className="depth-1 rounded-lg border bg-card p-5 transition-all hover:border-primary/30">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mb-2 font-semibold">Process Supervision</h3>
                    <p className="mb-2 text-xs text-muted-foreground">OpenAI, ICLR 2024</p>
                    <p className="text-sm text-muted-foreground">
                      78.2% accuracy foundation
                    </p>
                  </div>

                  <div className="depth-1 rounded-lg border bg-card p-5 transition-all hover:border-primary/30">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mb-2 font-semibold">Ensemble Methods</h3>
                    <a
                      href="https://arxiv.org/abs/2411.06535"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-2 inline-block font-mono text-xs text-primary hover:underline"
                    >
                      arxiv:2411.06535
                    </a>
                    <p className="text-sm text-muted-foreground">
                      73% → 95.6% precision boost
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="bg-section-white relative w-full py-24 md:py-32" id="pricing">

          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-16">
              {/* Heading - Full width */}
              <div className="col-1-4">
                <div className="mb-3 inline-block">
                  <div className="accent-bar"></div>
                </div>
                <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                  Transparent pricing
                </h2>
                <p className="mb-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  Bring your own API keys. No token markups. Just platform access.
                </p>
              </div>

              {/* Free - Column 1 */}
              <div className="col-1">
                <div className="flex h-full flex-col rounded-xl border bg-card p-6">
                  <div className="mb-6">
                    <div className="mb-1 text-5xl font-bold">$0</div>
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
              </div>

              {/* Pro - Columns 2-3 (Featured, clean) */}
              <div className="col-2-3">
                <div className="depth-2 relative flex h-full flex-col rounded-xl border-2 border-primary/20 bg-card p-8">
                  <div className="mb-8">
                    <div className="mb-4 inline-flex rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
                      Most Popular
                    </div>
                    <div className="mb-2 text-6xl font-bold">$99-299</div>
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

                  <Button asChild className="w-full" size="lg">
                    <Link href="#waitlist">Join beta</Link>
                  </Button>
                </div>
              </div>

              {/* Enterprise - Column 4 */}
              <div className="col-4">
                <div className="flex h-full flex-col rounded-xl border bg-card p-6">
                  <div className="mb-6">
                    <div className="mb-1 text-5xl font-bold">Custom</div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Enterprise</h3>
                  </div>
                  <ul className="mb-8 flex-1 space-y-3 text-sm text-muted-foreground">
                    <li>Everything in Pro</li>
                    <li>Custom SLAs</li>
                    <li>White-label options</li>
                    <li>Custom methods</li>
                    <li>Dedicated support</li>
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
        <section className="bg-section-navy relative w-full overflow-hidden py-32 md:py-40" id="waitlist">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-cyan/10 via-transparent to-accent-purple/10"></div>
          <div className="parallax-slow pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl"></div>
          <div className="parallax-slow pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-accent-cyan/20 blur-3xl" style={{animationDelay: '-10s'}}></div>

          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-12">
              {/* Main CTA - Columns 2-3 (centered) */}
              <div className="col-2-3">
                <div className="relative text-center">
                  <h2 className="mb-6 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
                    Join the beta
                  </h2>
                  <p className="mb-12 text-lg text-white/60">
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
