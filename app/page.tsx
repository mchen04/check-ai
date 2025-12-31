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
        {/* Hero Section - Radial gradient with overlapping elements */}
        <section className="relative w-full overflow-x-clip pb-32 pt-8 md:pb-40 md:pt-12 lg:pb-48 lg:pt-16">
          {/* Background gradient */}
          <div className="bg-radial-gradient pointer-events-none absolute inset-0"></div>

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

        {/* Problem - Stats with visual mockup */}
        <section className="section-angle relative w-full overflow-hidden bg-gradient-to-b from-muted/20 to-background py-24 md:py-32">
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

              {/* Stats Grid - Each takes 1 column */}
              <div className="col-1">
                <div className="group relative">
                  <div className="stat-float mb-5 text-6xl font-bold tracking-tight md:text-7xl">
                    $2.4M
                  </div>
                  <div className="mb-4 h-1 w-16 rounded-full bg-gradient-to-r from-primary via-primary/50 to-transparent"></div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Average cost per hallucination incident in regulated industries
                  </p>
                </div>
              </div>

              <div className="col-2">
                <div className="group relative">
                  <div className="stat-float mb-5 text-6xl font-bold tracking-tight md:text-7xl">
                    78%
                  </div>
                  <div className="mb-4 h-1 w-16 rounded-full bg-gradient-to-r from-primary via-primary/50 to-transparent"></div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Of enterprises now deploy AI in production systems
                  </p>
                </div>
              </div>

              <div className="col-3">
                <div className="group relative">
                  <div className="stat-float mb-5 text-6xl font-bold tracking-tight md:text-7xl">
                    100%
                  </div>
                  <div className="mb-4 h-1 w-16 rounded-full bg-gradient-to-r from-primary via-primary/50 to-transparent"></div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Legally liable for every AI output your product generates
                  </p>
                </div>
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

        {/* Why Different - Split visual comparison */}
        <section className="relative w-full overflow-hidden py-24 md:py-32">
          {/* Subtle dot pattern background */}
          <div className="bg-dot-pattern pointer-events-none absolute inset-0 opacity-40"></div>

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

              {/* Traditional - Column 1 (narrow) */}
              <div className="col-1">
                <div className="relative rounded-xl border-2 border-destructive/30 bg-gradient-to-br from-destructive/10 to-destructive/5 p-6">
                  <div className="absolute -left-2 -top-2 h-12 w-12 rounded-full bg-destructive/20 blur-xl"></div>
                  <div className="mb-5 text-xs font-bold uppercase tracking-widest text-destructive">
                    Traditional
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-destructive/20">
                        <X className="h-2.5 w-2.5 text-destructive" />
                      </div>
                      <span>Single method</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-destructive/20">
                        <X className="h-2.5 w-2.5 text-destructive" />
                      </div>
                      <span>One-size-fits-all</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-destructive/20">
                        <X className="h-2.5 w-2.5 text-destructive" />
                      </div>
                      <span>Domain-limited</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* VerifyAI - Columns 2-4 (wider for emphasis) */}
              <div className="col-2-4 depth-3 glow-primary relative overflow-hidden rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card to-primary/5 p-8 hover-lift">
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"></div>
                <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl"></div>

                <div className="relative">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/60 to-transparent"></div>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">
                      VerifyAI
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-l from-primary/60 to-transparent"></div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-3">
                    <div className="flex flex-col gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="mb-1 font-semibold">7 Methods</div>
                        <p className="text-xs text-muted-foreground">Research-backed verification</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="mb-1 font-semibold">Custom Weighting</div>
                        <p className="text-xs text-muted-foreground">Tailored to your domain</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="mb-1 font-semibold">Universal</div>
                        <p className="text-xs text-muted-foreground">Works across all domains</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The 7 Methods - Grid card layout */}
        <section className="bg-gradient-chroma relative w-full overflow-hidden py-24 md:py-32" id="methods">
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

              {/* Method 1 - Semantic - Column 1 */}
              <div className="col-1">
                <div className="depth-1 group rounded-xl border bg-card p-5 transition-all hover:border-primary/30 hover-lift">
                  <Zap className="mb-4 h-6 w-6 text-primary/60" />
                  <h3 className="mb-2 text-lg font-semibold">Semantic Similarity</h3>
                  <p className="mb-3 font-mono text-xs text-muted-foreground">FPR: 50-100% • ~100ms</p>
                  <p className="mb-2 text-sm leading-relaxed text-muted-foreground">
                    Quick filtering via embeddings
                  </p>
                  <span className="text-xs font-medium text-primary">Pre-filtering</span>
                </div>
              </div>

              {/* Method 2 - Reasoning - Column 2 */}
              <div className="col-2">
                <div className="depth-1 group rounded-xl border bg-card p-5 transition-all hover:border-primary/30 hover-lift">
                  <Activity className="mb-4 h-6 w-6 text-primary/60" />
                  <h3 className="mb-2 text-lg font-semibold">Reasoning-Based</h3>
                  <p className="mb-3 font-mono text-xs text-muted-foreground">FPR: 7% • 2-3s</p>
                  <p className="mb-2 text-sm leading-relaxed text-muted-foreground">
                    Chain-of-thought analysis
                  </p>
                  <span className="text-xs font-medium text-primary">General use</span>
                </div>
              </div>

              {/* Method 3 - Tool - Columns 3-4 (Featured) */}
              <div className="col-3-4">
                <div className="depth-2 group relative overflow-hidden rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-card p-6 transition-all hover:border-primary/50 hover-lift">
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl"></div>
                  <div className="relative flex items-start gap-6">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Code className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-2 text-xl font-semibold">Tool-Augmented</h3>
                      <p className="mb-3 font-mono text-xs text-muted-foreground">FPR: ~2% • 1-2s</p>
                      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                        Web search and code execution. Highest accuracy for verifiable facts.
                      </p>
                      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        Best for factual claims
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Method 4 - BiPRM - Columns 1-2 */}
              <div className="col-1-2">
                <div className="depth-1 group rounded-xl border bg-card p-5 transition-all hover:border-primary/30 hover-lift">
                  <Shield className="mb-4 h-6 w-6 text-primary/60" />
                  <h3 className="mb-2 text-lg font-semibold">BiPRM</h3>
                  <p className="mb-3 font-mono text-xs text-muted-foreground">FPR: ~10% • 3-5s</p>
                  <p className="mb-2 text-sm leading-relaxed text-muted-foreground">
                    Bidirectional reasoning. 31.9% more accurate than unidirectional.
                  </p>
                  <span className="text-xs font-medium text-primary">Medical & legal</span>
                </div>
              </div>

              {/* Method 5 - Ensemble - Column 3 */}
              <div className="col-3">
                <div className="depth-1 group rounded-xl border bg-card p-5 transition-all hover:border-primary/30 hover-lift">
                  <BarChart className="mb-4 h-6 w-6 text-primary/60" />
                  <h3 className="mb-2 text-lg font-semibold">Ensemble</h3>
                  <p className="mb-3 font-mono text-xs text-muted-foreground">FPR: 20-40% • 5-10s</p>
                  <p className="mb-2 text-sm leading-relaxed text-muted-foreground">
                    Multiple models voting
                  </p>
                  <span className="text-xs font-medium text-primary">High-stakes</span>
                </div>
              </div>

              {/* Method 6 - Entropy - Column 4 */}
              <div className="col-4">
                <div className="depth-1 group rounded-xl border bg-card p-5 transition-all hover:border-primary/30 hover-lift">
                  <CheckCircle className="mb-4 h-6 w-6 text-primary/60" />
                  <h3 className="mb-2 text-lg font-semibold">Semantic Entropy</h3>
                  <p className="mb-3 font-mono text-xs text-muted-foreground">FPR: TBD • ~200ms</p>
                  <p className="mb-2 text-sm leading-relaxed text-muted-foreground">
                    Consistency detection
                  </p>
                  <span className="text-xs font-medium text-primary">Patterns</span>
                </div>
              </div>

              {/* Method 7 - Formal - Full width featured */}
              <div className="col-1-4">
                <div className="depth-2 group relative overflow-hidden rounded-xl border-2 border-primary/40 bg-gradient-to-r from-primary/8 via-card to-primary/5 p-8 hover-lift">
                  <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-primary via-primary/50 to-transparent"></div>
                  <div className="flex items-start gap-6">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                        <h3 className="text-xl font-semibold">Formal Verification</h3>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          Coming Soon
                        </span>
                      </div>
                      <p className="mb-3 font-mono text-xs text-muted-foreground">FPR: 0% • Variable</p>
                      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                        Mathematical proofs for cryptography and smart contracts. Zero false positives
                        when applicable.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases - Configuration Display - 1 intro + 3 cards */}
        <section className="relative w-full overflow-hidden py-24 md:py-32">
          <div className="bg-radial-gradient-bottom pointer-events-none absolute inset-0"></div>

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

              {/* Medical AI - Columns 3-4 */}
              <div className="col-3-4">
                <div className="depth-2 relative overflow-hidden rounded-xl border bg-card p-8 hover-lift">
                  <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/5 blur-2xl"></div>
                  <div className="relative">
                    <div className="mb-6 flex items-baseline gap-4">
                      <h3 className="text-2xl font-bold">Medical AI</h3>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        High Accuracy
                      </span>
                    </div>
                    <div className="mb-6 space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium">BiPRM</span>
                          <span className="font-mono text-xs text-muted-foreground">60%</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-muted">
                          <div className="h-full w-[60%] rounded-full bg-gradient-to-r from-primary to-primary/80"></div>
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium">Tool</span>
                          <span className="font-mono text-xs text-muted-foreground">30%</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-muted">
                          <div className="h-full w-[30%] rounded-full bg-gradient-to-r from-primary/60 to-primary/40"></div>
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium">Semantic</span>
                          <span className="font-mono text-xs text-muted-foreground">10%</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-muted">
                          <div className="h-full w-[10%] rounded-full bg-gradient-to-r from-primary/30 to-primary/20"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legal AI - Column 1 */}
              <div className="col-1">
                <div className="depth-1 rounded-xl border bg-card p-6 hover-lift">
                  <h3 className="mb-5 text-xl font-bold">Legal AI</h3>
                  <div className="mb-5 space-y-3">
                    <div>
                      <div className="mb-2 text-xs text-muted-foreground">Ensemble</div>
                      <div className="h-2.5 rounded-full bg-primary"></div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs text-muted-foreground">Tool</div>
                      <div className="h-2.5 rounded-full bg-primary"></div>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-primary">50/50 split</p>
                </div>
              </div>

              {/* Support AI - Column 2 */}
              <div className="col-2">
                <div className="depth-1 rounded-xl border bg-card p-6 hover-lift">
                  <h3 className="mb-5 text-xl font-bold">Support AI</h3>
                  <div className="mb-5 space-y-3">
                    <div>
                      <div className="mb-2 text-xs text-muted-foreground">Reasoning</div>
                      <div className="h-2.5 rounded-full bg-primary" style={{width: '80%'}}></div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs text-muted-foreground">Semantic</div>
                      <div className="h-2.5 rounded-full bg-primary/50" style={{width: '20%'}}></div>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-primary">Speed focused</p>
                </div>
              </div>

              {/* CTA - Columns 3-4 */}
              <div className="col-3-4">
                <div className="depth-2 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-card p-6">
                  <p className="mb-4 text-sm font-semibold">Need a custom configuration?</p>
                  <p className="mb-5 text-sm text-muted-foreground">
                    Work with our team to design the optimal verification mix for your specific use case.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="#waitlist">Get in touch</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Research Foundation - Asymmetric with visual papers */}
        <section className="section-angle relative w-full overflow-hidden bg-gradient-to-b from-muted/40 to-muted/10 py-24 md:py-32">
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

              {/* Research papers grid - Creative spans */}
              <div className="col-1-2">
                <div className="depth-1 group rounded-xl border bg-card p-5 transition-all hover:border-primary/30 hover-lift">
                  <FileText className="mb-3 h-5 w-5 text-primary/60" />
                  <h3 className="mb-2 text-sm font-semibold">Semantic Illusion Problem</h3>
                  <a
                    href="https://arxiv.org/abs/2512.15068"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-2 inline-block font-mono text-xs text-primary hover:underline"
                  >
                    arxiv:2512.15068
                  </a>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    50-100% FPR validates multi-method approach
                  </p>
                </div>
              </div>

              <div className="col-3">
                <div className="depth-1 group rounded-xl border bg-card p-5 transition-all hover:border-primary/30 hover-lift">
                  <FileText className="mb-3 h-5 w-5 text-primary/60" />
                  <h3 className="mb-2 text-sm font-semibold">FacTool</h3>
                  <a
                    href="https://arxiv.org/abs/2307.13528"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-2 inline-block font-mono text-xs text-primary hover:underline"
                  >
                    arxiv:2307.13528
                  </a>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    98.97% F1 score
                  </p>
                </div>
              </div>

              <div className="col-4">
                <div className="depth-1 group rounded-xl border bg-card p-5 transition-all hover:border-primary/30 hover-lift">
                  <FileText className="mb-3 h-5 w-5 text-primary/60" />
                  <h3 className="mb-2 text-sm font-semibold">BiPRM Research</h3>
                  <a
                    href="https://arxiv.org/abs/2508.01682"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-2 inline-block font-mono text-xs text-primary hover:underline"
                  >
                    arxiv:2508.01682
                  </a>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    31.9% improvement
                  </p>
                </div>
              </div>

              <div className="col-1-2">
                <div className="depth-1 group rounded-xl border bg-card p-5 transition-all hover:border-primary/30 hover-lift">
                  <FileText className="mb-3 h-5 w-5 text-primary/60" />
                  <h3 className="mb-2 text-sm font-semibold">Process Supervision</h3>
                  <p className="mb-2 text-xs text-muted-foreground">OpenAI, ICLR 2024</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    78.2% accuracy foundation
                  </p>
                </div>
              </div>

              <div className="col-3-4">
                <div className="depth-1 group rounded-xl border bg-card p-5 transition-all hover:border-primary/30 hover-lift">
                  <FileText className="mb-3 h-5 w-5 text-primary/60" />
                  <h3 className="mb-2 text-sm font-semibold">Ensemble Methods</h3>
                  <a
                    href="https://arxiv.org/abs/2411.06535"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-2 inline-block font-mono text-xs text-primary hover:underline"
                  >
                    arxiv:2411.06535
                  </a>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Raises precision from 73% to 95.6%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section - Enhanced visual hierarchy */}
        <section className="relative w-full overflow-hidden py-24 md:py-32" id="pricing">
          <div className="bg-dot-pattern pointer-events-none absolute inset-0 opacity-30"></div>

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
                <div className="depth-1 flex h-full flex-col rounded-xl border bg-card p-6 hover-lift">
                  <div className="mb-6">
                    <div className="mb-1 text-5xl font-bold">$0</div>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Free</h3>
                  </div>
                  <ul className="mb-8 flex-1 space-y-3 text-sm">
                    <li className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span>100 verifications</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span>Semantic method</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span>API access</span>
                    </li>
                  </ul>
                  <Button variant="outline" size="default" asChild className="w-full">
                    <Link href="#waitlist">Join beta</Link>
                  </Button>
                </div>
              </div>

              {/* Pro - Columns 2-3 (Featured, emphasized) */}
              <div className="col-2-3">
                <div className="depth-3 glow-primary relative flex h-full flex-col overflow-hidden rounded-xl border-2 border-primary bg-gradient-to-br from-card via-primary/5 to-primary/10 p-8 hover-lift">
                  <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl"></div>
                  <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl"></div>

                  <div className="relative">
                    <div className="mb-8">
                      <div className="mb-4 inline-flex rounded-full bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                        Most Popular
                      </div>
                      <div className="mb-2 text-6xl font-bold">$99-299</div>
                      <div className="mb-1 text-sm text-muted-foreground">/month</div>
                      <h3 className="text-base font-semibold uppercase tracking-widest text-muted-foreground">Pro</h3>
                    </div>

                    <ul className="mb-8 grid flex-1 grid-cols-2 gap-x-6 gap-y-4 text-sm">
                      <li className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Check className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span><strong>Unlimited</strong> verifications</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Check className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span>All 7 methods</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Check className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span>Custom weighting</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Check className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span><strong>BYOK</strong> (no markup)</span>
                      </li>
                      <li className="col-span-2 flex items-start gap-2.5">
                        <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Check className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span>Priority support</span>
                      </li>
                    </ul>

                    <Button asChild className="w-full shadow-lg shadow-primary/20" size="lg">
                      <Link href="#waitlist">Join beta</Link>
                    </Button>

                    <p className="mt-6 text-center text-xs italic text-muted-foreground">
                      One avoided incident pays for years of platform access
                    </p>
                  </div>
                </div>
              </div>

              {/* Enterprise - Column 4 */}
              <div className="col-4">
                <div className="depth-1 flex h-full flex-col rounded-xl border bg-card p-6 hover-lift">
                  <div className="mb-6">
                    <div className="mb-1 text-5xl font-bold">Custom</div>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Enterprise</h3>
                  </div>
                  <ul className="mb-8 flex-1 space-y-3 text-sm text-muted-foreground">
                    <li>Everything in Pro</li>
                    <li>Custom SLAs</li>
                    <li>White-label</li>
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

        {/* CTA Section / Waitlist - Centered with visual emphasis */}
        <section className="relative w-full overflow-hidden bg-gradient-to-b from-background via-muted/20 to-background py-28 md:py-36" id="waitlist">
          <div className="bg-radial-gradient pointer-events-none absolute inset-0"></div>

          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-12">
              {/* Main CTA - Columns 2-3 (centered) */}
              <div className="col-2-3">
                <div className="depth-3 relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-card p-10">
                  <div className="absolute -right-16 top-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl"></div>
                  <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-primary/5 blur-3xl"></div>

                  <div className="relative text-center">
                    <h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                      Join the beta
                    </h2>
                    <p className="mb-10 text-lg text-muted-foreground">
                      We&apos;re working with design partners in healthcare, legal, and finance to
                      validate our approach.
                    </p>

                    <div className="mb-10 flex flex-col gap-3 sm:flex-row">
                      <input
                        type="email"
                        placeholder="you@company.com"
                        className="flex-1 rounded-lg border border-input bg-background px-5 py-4 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <Button size="lg" className="shadow-lg shadow-primary/20 sm:w-auto">
                        Join waitlist
                      </Button>
                    </div>

                    {/* Benefits */}
                    <div className="space-y-4 border-t border-border/50 pt-8">
                      <div className="flex items-start gap-3 text-left">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                        <div className="flex-1">
                          <span className="font-semibold">Extended free tier</span>
                          <span className="text-sm text-muted-foreground"> for early adopters</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 text-left">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                        <div className="flex-1">
                          <span className="font-semibold">Shape the product</span>
                          <span className="text-sm text-muted-foreground"> with direct input</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 text-left">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                        <div className="flex-1">
                          <span className="font-semibold">Lock in beta pricing</span>
                          <span className="text-sm text-muted-foreground"> when we launch</span>
                        </div>
                      </div>
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
