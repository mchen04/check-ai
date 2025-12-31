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
        {/* Hero Section - 2 cols text + 2+ cols API demo extending right */}
        <section className="relative w-full overflow-x-clip pb-24 pt-2 md:pb-32 md:pt-3 lg:pb-40 lg:pt-4">
          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col items-center gap-y-12">
              {/* Left: Text Content - Columns 1-2 */}
              <div className="relative z-10 col-1-2 space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                  </span>
                  <span className="font-medium">Now in Beta</span>
                </div>
                <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
                  Your AI outputs cost you $2.4M when they&apos;re wrong
                </h1>
                <p className="text-xl leading-relaxed text-muted-foreground lg:text-2xl">
                  Catch hallucinations before deployment with seven research-backed verification
                  methods. Configure the mix that fits your use case—medical, legal, or anything in
                  between.
                </p>
                <div className="flex flex-col gap-4 pt-4 sm:flex-row">
                  <Button size="lg" className="text-base" asChild>
                    <Link href="#waitlist">Join the beta</Link>
                  </Button>
                  <Button variant="outline" size="lg" className="text-base" asChild>
                    <Link href="#methods">See how it works</Link>
                  </Button>
                </div>
              </div>

              {/* Right: API Example - Columns 3-4 + extends right beyond grid */}
              <div className="relative z-10 col-3-4 extend-right">
                <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/0 blur-2xl"></div>
                <div className="card-float depth-3 relative rounded-xl border bg-card p-8 backdrop-blur-sm">
                  <div className="mb-6 flex items-center gap-3 border-b border-border/50 pb-4">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-destructive/30"></div>
                      <div className="h-3 w-3 rounded-full bg-yellow-500/30"></div>
                      <div className="h-3 w-3 rounded-full bg-success/30"></div>
                    </div>
                    <span className="font-mono text-sm text-muted-foreground">POST /v1/verify</span>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        REQUEST
                      </div>
                      <pre className="rounded-lg bg-muted/50 p-5 font-mono text-sm">
                        <code className="text-foreground/90">{`{
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
                    <div>
                      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        RESPONSE
                      </div>
                      <pre className="rounded-lg bg-muted/50 p-5 font-mono text-sm">
                        <code className="text-foreground/90">{`{
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

        {/* Problem - Stats Display - 1 col intro + 3 stat columns */}
        <section className="w-full border-y bg-muted/30 py-20 md:py-28">
          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-16">
              {/* Heading - Column 1 */}
              <div className="col-1">
                <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                  The stakes are higher than you think
                </h2>
                <p className="text-base leading-relaxed text-muted-foreground">
                  Even GPT-5 will have an 8% error rate. Zero hallucinations is mathematically
                  impossible.
                </p>
              </div>

              {/* Stats - Each stat gets 1 column (cols 2, 3, 4) */}
              <div className="col-2">
                <div className="stat-float mb-4 text-6xl font-bold tracking-tight md:text-7xl">$2.4M</div>
                <div className="mb-4 h-1 w-20 rounded-full bg-gradient-to-r from-primary to-primary/20"></div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Average cost per hallucination incident in regulated industries
                </p>
              </div>

              <div className="col-3">
                <div className="stat-float mb-4 text-6xl font-bold tracking-tight md:text-7xl">78%</div>
                <div className="mb-4 h-1 w-20 rounded-full bg-gradient-to-r from-primary to-primary/20"></div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Of enterprises now deploy AI in production systems
                </p>
              </div>

              <div className="col-4">
                <div className="stat-float mb-4 text-6xl font-bold tracking-tight md:text-7xl">100%</div>
                <div className="mb-4 h-1 w-20 rounded-full bg-gradient-to-r from-primary to-primary/20"></div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Legally liable for every AI output your product generates
                </p>
              </div>

              {/* Case study quote - Spans columns 2-4 */}
              <div className="col-2-4 depth-1 relative rounded-lg border-l-4 border-primary/40 bg-gradient-to-r from-primary/8 to-transparent py-8 pl-8 pr-6 hover-lift">
                <div className="absolute -top-4 left-6 text-6xl font-bold text-primary/15">&ldquo;</div>
                <p className="relative text-base leading-relaxed">
                  Air Canada was sued after their chatbot invented a refund policy. The court ruled
                  the company was legally liable for AI outputs.{' '}
                  <span className="font-semibold text-foreground">
                    Verification isn&apos;t optional anymore.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Different Section - Asymmetric comparison */}
        <section className="w-full py-20 md:py-28">
          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-12">
              {/* Heading - Column 1 */}
              <div className="col-1">
                <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  One method doesn&apos;t fit all use cases
                </h2>
              </div>

              {/* Description - Columns 2-4 */}
              <div className="col-2-4">
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Existing solutions lock you into a single approach. Medical AI needs different
                  verification than customer support. Legal AI needs different checks than
                  e-commerce.
                </p>
              </div>

              {/* Traditional - Columns 1-2 */}
              <div className="col-1-2 rounded-lg border border-destructive/20 bg-destructive/5 p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-destructive/40 to-transparent"></div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-destructive">
                    Traditional
                  </span>
                  <div className="h-px w-12 bg-gradient-to-l from-destructive/40 to-transparent"></div>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-sm text-muted-foreground">
                    <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                    <span>Single verification method</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-muted-foreground">
                    <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                    <span>One-size-fits-all approach</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-muted-foreground">
                    <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                    <span>Limited to specific domains</span>
                  </li>
                </ul>
              </div>

              {/* VerifyAI - Columns 3-4 */}
              <div className="col-3-4 depth-2 glow-primary rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 hover-lift">
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-primary to-transparent"></div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    VerifyAI
                  </span>
                  <div className="h-px w-12 bg-gradient-to-l from-primary to-transparent"></div>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>
                      <span className="font-semibold">7 verification methods</span> to choose from
                    </span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>
                      <span className="font-semibold">Custom weighting</span> for your use case
                    </span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>
                      <span className="font-semibold">Works across all domains</span>
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* The 7 Methods - Sticky Scroll Layout */}
        <section className="w-full bg-muted/30 py-20 md:py-28" id="methods">
          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col sticky-scroll-container gap-12">
              {/* Left: Sticky Heading - Column 1 */}
              <div className="col-1 sticky-scroll-left">
                <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                  Seven verification methods
                </h2>
                <p className="text-base leading-relaxed text-muted-foreground">
                  Mix and match based on your use case. Each method has different speed-accuracy
                  tradeoffs.
                </p>
              </div>

              {/* Right: Scrolling Methods List - Columns 2-4 */}
              <div className="col-2-4 space-y-1">
                {/* Method 1 */}
                <div className="group flex items-start gap-6 border-b border-border/50 py-6 transition-all hover:border-primary/30">
                  <Zap className="mt-1 h-5 w-5 flex-shrink-0 text-primary/60" />
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <h3 className="text-lg font-semibold">Semantic Similarity</h3>
                      <span className="font-mono text-xs text-muted-foreground">FPR: 50-100% • ~100ms</span>
                    </div>
                    <p className="mb-1 text-sm leading-relaxed text-muted-foreground">
                      Embedding comparison for quick filtering. Fast but vulnerable to RLHF hallucinations.
                    </p>
                    <p className="text-xs font-medium text-primary">Best for pre-filtering</p>
                  </div>
                </div>

                {/* Method 2 */}
                <div className="group flex items-start gap-6 border-b border-border/50 py-6 transition-all hover:border-primary/30">
                  <Activity className="mt-1 h-5 w-5 flex-shrink-0 text-primary/60" />
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <h3 className="text-lg font-semibold">Reasoning-Based</h3>
                      <span className="font-mono text-xs text-muted-foreground">FPR: 7% • 2-3s</span>
                    </div>
                    <p className="mb-1 text-sm leading-relaxed text-muted-foreground">
                      Chain-of-thought reasoning analysis. General purpose verification.
                    </p>
                    <p className="text-xs font-medium text-primary">Best for general use</p>
                  </div>
                </div>

                {/* Method 3 */}
                <div className="group flex items-start gap-6 border-b border-border/50 py-6 transition-all hover:border-primary/30">
                  <Code className="mt-1 h-5 w-5 flex-shrink-0 text-primary/60" />
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <h3 className="text-lg font-semibold">Tool-Augmented</h3>
                      <span className="font-mono text-xs text-muted-foreground">FPR: ~2% • 1-2s</span>
                    </div>
                    <p className="mb-1 text-sm leading-relaxed text-muted-foreground">
                      Web search and code execution. Highest accuracy for verifiable facts.
                    </p>
                    <p className="text-xs font-medium text-primary">Best for factual claims</p>
                  </div>
                </div>

                {/* Method 4 */}
                <div className="group flex items-start gap-6 border-b border-border/50 py-6 transition-all hover:border-primary/30">
                  <Shield className="mt-1 h-5 w-5 flex-shrink-0 text-primary/60" />
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <h3 className="text-lg font-semibold">BiPRM</h3>
                      <span className="font-mono text-xs text-muted-foreground">FPR: ~10% • 3-5s</span>
                    </div>
                    <p className="mb-1 text-sm leading-relaxed text-muted-foreground">
                      Bidirectional reasoning. 31.9% more accurate than unidirectional.
                    </p>
                    <p className="text-xs font-medium text-primary">Best for medical & legal</p>
                  </div>
                </div>

                {/* Method 5 */}
                <div className="group flex items-start gap-6 border-b border-border/50 py-6 transition-all hover:border-primary/30">
                  <BarChart className="mt-1 h-5 w-5 flex-shrink-0 text-primary/60" />
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <h3 className="text-lg font-semibold">Ensemble</h3>
                      <span className="font-mono text-xs text-muted-foreground">FPR: 20-40% • 5-10s</span>
                    </div>
                    <p className="mb-1 text-sm leading-relaxed text-muted-foreground">
                      Multiple models voting. Raises precision from 73% to 95.6%.
                    </p>
                    <p className="text-xs font-medium text-primary">Best for high-stakes</p>
                  </div>
                </div>

                {/* Method 6 */}
                <div className="group flex items-start gap-6 border-b border-border/50 py-6 transition-all hover:border-primary/30">
                  <CheckCircle className="mt-1 h-5 w-5 flex-shrink-0 text-primary/60" />
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <h3 className="text-lg font-semibold">Semantic Entropy</h3>
                      <span className="font-mono text-xs text-muted-foreground">FPR: TBD • ~200ms</span>
                    </div>
                    <p className="mb-1 text-sm leading-relaxed text-muted-foreground">
                      Consistency across generations to detect patterns.
                    </p>
                    <p className="text-xs font-medium text-primary">Best for pattern detection</p>
                  </div>
                </div>

                {/* Method 7 - Featured */}
                <div className="group relative overflow-hidden border-y-2 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent py-8 transition-all hover:border-primary/50">
                  <div className="flex items-start gap-6 px-4">
                    <FileText className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <h3 className="text-lg font-semibold">Formal Verification</h3>
                        <span className="font-mono text-xs text-muted-foreground">FPR: 0% • Variable</span>
                      </div>
                      <p className="mb-1 text-sm leading-relaxed text-muted-foreground">
                        Mathematical proofs for cryptography and smart contracts. Zero false positives
                        when applicable.
                      </p>
                      <p className="text-xs font-medium text-primary">Best for crypto & code • Coming soon</p>
                    </div>
                  </div>
                  <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-primary via-primary/50 to-transparent"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases - Configuration Display - 1 intro + 3 cards */}
        <section className="w-full py-20 md:py-28">
          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-12">
              {/* Heading - Column 1 */}
              <div className="col-1">
                <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                  Configure for your domain
                </h2>
                <p className="text-base leading-relaxed text-muted-foreground">
                  Different industries need different verification mixes
                </p>
              </div>

              {/* Medical AI - Column 2 */}
              <div className="col-2 depth-1 rounded-lg border bg-card p-6 hover-lift">
                <h3 className="mb-6 text-xl font-semibold">Medical AI</h3>
                <div className="mb-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 flex-[6] rounded-full bg-primary"></div>
                    <span className="font-mono text-sm font-medium">60%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 flex-[3] rounded-full bg-primary/50"></div>
                    <span className="font-mono text-sm">30%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 flex-[1] rounded-full bg-primary/25"></div>
                    <span className="font-mono text-sm">10%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  BiPRM, Tool, Semantic
                </p>
              </div>

              {/* Legal AI - Column 3 */}
              <div className="col-3 depth-1 rounded-lg border bg-card p-6 hover-lift">
                <h3 className="mb-6 text-xl font-semibold">Legal AI</h3>
                <div className="mb-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 flex-1 rounded-full bg-primary"></div>
                    <span className="font-mono text-sm font-medium">50%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 flex-1 rounded-full bg-primary"></div>
                    <span className="font-mono text-sm font-medium">50%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ensemble, Tool
                </p>
              </div>

              {/* Support AI - Column 4 */}
              <div className="col-4 depth-1 rounded-lg border bg-card p-6 hover-lift">
                <h3 className="mb-6 text-xl font-semibold">Support AI</h3>
                <div className="mb-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 flex-[4] rounded-full bg-primary"></div>
                    <span className="font-mono text-sm font-medium">80%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 flex-[1] rounded-full bg-primary/50"></div>
                    <span className="font-mono text-sm">20%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Reasoning, Semantic
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Research Foundation - Asymmetric layout */}
        <section className="w-full border-y bg-muted/30 py-20 md:py-28">
          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-12">
              {/* Heading - Column 1 */}
              <div className="col-1">
                <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                  Backed by peer-reviewed research
                </h2>
                <p className="text-base leading-relaxed text-muted-foreground">
                  Each method is grounded in published academic work, not speculation
                </p>
              </div>

              {/* Research papers - Columns 2-4 as stacked list */}
              <div className="col-2-4 space-y-6">
                <div className="group flex gap-4 border-b border-border/30 pb-6 transition-all hover:border-primary/30">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 text-sm font-semibold">Semantic Illusion Problem</h3>
                    <a
                      href="https://arxiv.org/abs/2512.15068"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-1 inline-block font-mono text-xs text-primary hover:underline"
                    >
                      arxiv:2512.15068
                    </a>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      50-100% FPR on RLHF-trained outputs validates multi-method approach
                    </p>
                  </div>
                </div>

                <div className="group flex gap-4 border-b border-border/30 pb-6 transition-all hover:border-primary/30">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 text-sm font-semibold">Process Supervision (OpenAI, ICLR 2024)</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      78.2% accuracy on MATH dataset—foundation for BiPRM method
                    </p>
                  </div>
                </div>

                <div className="group flex gap-4 border-b border-border/30 pb-6 transition-all hover:border-primary/30">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 text-sm font-semibold">FacTool</h3>
                    <a
                      href="https://arxiv.org/abs/2307.13528"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-1 inline-block font-mono text-xs text-primary hover:underline"
                    >
                      arxiv:2307.13528
                    </a>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      98.97% F1 with tool-grounded verification
                    </p>
                  </div>
                </div>

                <div className="group flex gap-4 border-b border-border/30 pb-6 transition-all hover:border-primary/30">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 text-sm font-semibold">BiPRM Research</h3>
                    <a
                      href="https://arxiv.org/abs/2508.01682"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-1 inline-block font-mono text-xs text-primary hover:underline"
                    >
                      arxiv:2508.01682
                    </a>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      31.9% more accurate than unidirectional verification
                    </p>
                  </div>
                </div>

                <div className="group flex gap-4 pb-6 transition-all">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 text-sm font-semibold">Ensemble Methods</h3>
                    <a
                      href="https://arxiv.org/abs/2411.06535"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-1 inline-block font-mono text-xs text-primary hover:underline"
                    >
                      arxiv:2411.06535
                    </a>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      3 diverse models raise precision from 73% to 95.6%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section - Asymmetric 1 + 2 + 1 layout */}
        <section className="w-full py-20 md:py-28" id="pricing">
          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col gap-y-12">
              {/* Heading - Columns 1-2 */}
              <div className="col-1-2">
                <h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
                  Transparent pricing
                </h2>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Bring your own API keys. No token markups. Just platform access.
                </p>
              </div>

              {/* Free - Column 1 */}
              <div className="col-1 flex flex-col rounded-lg border bg-card p-6">
                <div className="mb-6">
                  <div className="mb-2 text-5xl font-bold">$0</div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Free</h3>
                </div>
                <ul className="mb-8 flex-1 space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>100 verifications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>Semantic method</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>API access</span>
                  </li>
                </ul>
                <Button variant="outline" size="default" asChild className="w-full">
                  <Link href="#waitlist">Join beta</Link>
                </Button>
              </div>

              {/* Pro - Columns 2-3 (Featured, 2x width) */}
              <div className="col-2-3 depth-3 glow-primary relative flex flex-col rounded-xl border-2 border-primary bg-gradient-to-br from-card to-primary/5 p-8 hover-lift">
                <div className="absolute right-4 top-4 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
                  Most Popular
                </div>
                <div className="mb-8">
                  <div className="mb-2 text-6xl font-bold">$99-299</div>
                  <div className="mb-1 text-sm text-muted-foreground">/month</div>
                  <h3 className="text-base font-semibold uppercase tracking-wide text-muted-foreground">Pro</h3>
                </div>
                <ul className="mb-8 grid flex-1 grid-cols-2 gap-4 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span><strong>Unlimited</strong> verifications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>All 7 methods</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>Custom weighting</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span><strong>BYOK</strong> (no markup)</span>
                  </li>
                  <li className="col-span-2 flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <Button asChild className="w-full" size="lg">
                  <Link href="#waitlist">Join beta</Link>
                </Button>
              </div>

              {/* Enterprise - Column 4 */}
              <div className="col-4 flex flex-col rounded-lg border bg-card p-6">
                <div className="mb-6">
                  <div className="mb-2 text-5xl font-bold">Custom</div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Enterprise</h3>
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

              {/* Note - Spans columns 2-3 under Pro */}
              <div className="col-2-3">
                <p className="text-center text-sm italic text-muted-foreground">
                  One avoided incident pays for years of the platform
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section / Waitlist - Centered in columns 2-3 */}
        <section className="w-full border-y bg-muted/30 py-20 md:py-28" id="waitlist">
          <div className="content-wrapper content-wrapper-with-guides">
            <div className="content-constrained grid-4col">
              {/* Center content in columns 2-3 */}
              <div className="col-2-3">
                <div className="mb-10 text-center">
                  <h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">Join the beta</h2>
                  <p className="text-lg text-muted-foreground">
                    We&apos;re working with design partners in healthcare, legal, and finance to
                    validate our approach.
                  </p>
                </div>
                <div className="mb-12 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    placeholder="you@company.com"
                    className="flex-1 rounded-lg border border-input bg-background px-5 py-3.5 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button size="lg" className="text-base sm:w-auto">
                    Join waitlist
                  </Button>
                </div>

                {/* Benefits as flowing text with separators */}
                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6 text-center text-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                    <div>
                      <span className="font-semibold">Extended free tier</span>
                      <span className="text-muted-foreground"> for early adopters</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                    <div>
                      <span className="font-semibold">Shape the product</span>
                      <span className="text-muted-foreground"> with direct input</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                    <div>
                      <span className="font-semibold">Lock in beta pricing</span>
                      <span className="text-muted-foreground"> when we launch</span>
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
