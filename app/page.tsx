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
      <header className="sticky top-0 z-50 flex h-20 w-full items-center border-b border-border/50 bg-background/80 px-6 backdrop-blur-xl lg:px-8">
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
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full overflow-hidden pb-24 pt-2 md:pb-32 md:pt-3 lg:pb-40 lg:pt-4">
          <div className="container">
            <div className="mx-auto grid max-w-[1400px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
              {/* Left: Text Content */}
              <div className="space-y-8">
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

              {/* Right: API Example - Product Focused */}
              <div className="relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/20 to-primary/0 blur-lg"></div>
                <div className="relative rounded-xl border bg-card p-6 shadow-2xl">
                  <div className="mb-4 flex items-center gap-3 border-b border-border/50 pb-4">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-destructive/20"></div>
                      <div className="h-3 w-3 rounded-full bg-primary/20"></div>
                      <div className="h-3 w-3 rounded-full bg-success/20"></div>
                    </div>
                    <span className="font-mono text-sm text-muted-foreground">POST /v1/verify</span>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Request
                      </div>
                      <pre className="rounded-lg bg-muted/50 p-4 font-mono text-sm">
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
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Response
                      </div>
                      <pre className="rounded-lg bg-muted/50 p-4 font-mono text-sm">
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

        {/* Problem - Simplified Stats Section */}
        <section className="w-full border-y bg-muted/30 py-20 md:py-28">
          <div className="container">
            <div className="mx-auto max-w-[1000px] space-y-16">
              <div className="text-center">
                <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
                  The stakes are higher than you think
                </h2>
                <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                  Even GPT-5 will have an 8% error rate. Zero hallucinations is mathematically
                  impossible.
                </p>
              </div>

              <div className="grid gap-12 sm:grid-cols-3">
                <div className="text-center">
                  <div className="mb-4 text-6xl font-bold tracking-tight">$2.4M</div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Average cost per hallucination incident in regulated industries
                  </p>
                </div>
                <div className="text-center">
                  <div className="mb-4 text-6xl font-bold tracking-tight">78%</div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Of enterprises now deploy AI in production systems
                  </p>
                </div>
                <div className="text-center">
                  <div className="mb-4 text-6xl font-bold tracking-tight">100%</div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Legally liable for every AI output your product generates
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
                <p className="text-base leading-relaxed text-muted-foreground">
                  Air Canada was sued after their chatbot invented a refund policy. The court ruled
                  the company was legally liable for AI outputs. Verification isn&apos;t optional
                  anymore.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Different Section - Simplified */}
        <section className="w-full py-20 md:py-28">
          <div className="container">
            <div className="mx-auto max-w-[900px]">
              <div className="mb-16 text-center">
                <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
                  One method doesn&apos;t fit all use cases
                </h2>
                <p className="text-lg text-muted-foreground">
                  Existing solutions lock you into a single approach. Medical AI needs different
                  verification than customer support. Legal AI needs different checks than
                  e-commerce.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-border/50 bg-card p-6">
                  <div className="mb-3 text-sm font-medium text-muted-foreground">
                    Traditional Approach
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <X className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                      <span className="text-sm">Single verification method</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <X className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                      <span className="text-sm">One-size-fits-all approach</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <X className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                      <span className="text-sm">Limited to specific domains</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
                  <div className="mb-3 text-sm font-semibold">VerifyAI</div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm">7 verification methods to choose from</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm">Custom weighting for your use case</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm">Works across all domains</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The 7 Methods */}
        <section className="w-full bg-muted/30 py-20 md:py-28" id="methods">
          <div className="container">
            <div className="mx-auto max-w-[1100px]">
              <div className="mb-16 text-center">
                <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
                  Seven verification methods
                </h2>
                <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                  Mix and match based on your use case. Each method has different speed-accuracy
                  tradeoffs.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="group rounded-xl border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-sm">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="mb-1 text-lg font-semibold">Semantic Similarity</h3>
                      <p className="font-mono text-xs text-muted-foreground">
                        FPR: 50-100% • ~100ms
                      </p>
                    </div>
                    <Zap className="h-5 w-5 text-primary opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                    Embedding comparison for quick filtering. Fast but vulnerable to RLHF
                    hallucinations.
                  </p>
                  <p className="text-xs font-medium">Best for pre-filtering</p>
                </div>

                <div className="group rounded-xl border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-sm">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="mb-1 text-lg font-semibold">Reasoning-Based</h3>
                      <p className="font-mono text-xs text-muted-foreground">FPR: 7% • 2-3s</p>
                    </div>
                    <Activity className="h-5 w-5 text-primary opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                    Chain-of-thought reasoning analysis. General purpose verification.
                  </p>
                  <p className="text-xs font-medium">Best for general use</p>
                </div>

                <div className="group rounded-xl border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-sm">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="mb-1 text-lg font-semibold">Tool-Augmented</h3>
                      <p className="font-mono text-xs text-muted-foreground">FPR: ~2% • 1-2s</p>
                    </div>
                    <Code className="h-5 w-5 text-primary opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                    Web search and code execution. Highest accuracy for verifiable facts.
                  </p>
                  <p className="text-xs font-medium">Best for factual claims</p>
                </div>

                <div className="group rounded-xl border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-sm">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="mb-1 text-lg font-semibold">BiPRM</h3>
                      <p className="font-mono text-xs text-muted-foreground">FPR: ~10% • 3-5s</p>
                    </div>
                    <Shield className="h-5 w-5 text-primary opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                    Bidirectional reasoning. 31.9% more accurate than unidirectional.
                  </p>
                  <p className="text-xs font-medium">Best for medical & legal</p>
                </div>

                <div className="group rounded-xl border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-sm">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="mb-1 text-lg font-semibold">Ensemble</h3>
                      <p className="font-mono text-xs text-muted-foreground">FPR: 20-40% • 5-10s</p>
                    </div>
                    <BarChart className="h-5 w-5 text-primary opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                    Multiple models voting. Raises precision from 73% to 95.6%.
                  </p>
                  <p className="text-xs font-medium">Best for high-stakes</p>
                </div>

                <div className="group rounded-xl border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-sm">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="mb-1 text-lg font-semibold">Semantic Entropy</h3>
                      <p className="font-mono text-xs text-muted-foreground">FPR: TBD • ~200ms</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-primary opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                    Consistency across generations to detect patterns.
                  </p>
                  <p className="text-xs font-medium">Best for pattern detection</p>
                </div>

                <div className="group rounded-xl border border-primary/30 bg-primary/5 p-6 transition-all hover:border-primary/50 hover:shadow-sm sm:col-span-2 lg:col-span-3">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="mb-1 text-lg font-semibold">Formal Verification</h3>
                      <p className="font-mono text-xs text-muted-foreground">FPR: 0% • Variable</p>
                    </div>
                    <FileText className="h-5 w-5 text-primary opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                    Mathematical proofs for cryptography and smart contracts. Zero false positives
                    when applicable.
                  </p>
                  <p className="text-xs font-medium">Best for crypto & code (Coming soon)</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases - Simplified */}
        <section className="w-full py-20 md:py-28">
          <div className="container">
            <div className="mx-auto max-w-[900px]">
              <div className="mb-12 text-center">
                <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  Configure for your domain
                </h2>
                <p className="text-base text-muted-foreground">
                  Different industries need different verification mixes
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="rounded-xl border bg-card p-5">
                  <h3 className="mb-3 font-semibold">Medical AI</h3>
                  <div className="mb-3 space-y-1 font-mono text-xs">
                    <div>60% BiPRM</div>
                    <div>30% Tool</div>
                    <div>10% Semantic</div>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Prioritizes accuracy and medical fact-checking
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-5">
                  <h3 className="mb-3 font-semibold">Legal AI</h3>
                  <div className="mb-3 space-y-1 font-mono text-xs">
                    <div>50% Ensemble</div>
                    <div>50% Tool</div>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Maximum accuracy with citation verification
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-5">
                  <h3 className="mb-3 font-semibold">Support AI</h3>
                  <div className="mb-3 space-y-1 font-mono text-xs">
                    <div>80% Reasoning</div>
                    <div>20% Semantic</div>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Balanced speed and accuracy
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Research Foundation */}
        <section className="w-full border-y bg-muted/30 py-20 md:py-28">
          <div className="container">
            <div className="mx-auto max-w-[1000px]">
              <div className="mb-12 text-center">
                <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  Backed by peer-reviewed research
                </h2>
                <p className="text-base text-muted-foreground">
                  Each method is grounded in published academic work, not speculation
                </p>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg border bg-card p-5">
                  <div className="flex items-start gap-4">
                    <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-baseline gap-2">
                        <h3 className="font-semibold">Semantic Illusion Problem</h3>
                        <a
                          href="https://arxiv.org/abs/2512.15068"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          arxiv:2512.15068
                        </a>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        50-100% FPR on RLHF-trained outputs validates multi-method approach
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-5">
                  <div className="flex items-start gap-4">
                    <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1">
                        <h3 className="font-semibold">Process Supervision (OpenAI, ICLR 2024)</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        78.2% accuracy on MATH dataset—foundation for BiPRM method
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-5">
                  <div className="flex items-start gap-4">
                    <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-baseline gap-2">
                        <h3 className="font-semibold">FacTool</h3>
                        <a
                          href="https://arxiv.org/abs/2307.13528"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          arxiv:2307.13528
                        </a>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        98.97% F1 with tool-grounded verification
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-5">
                  <div className="flex items-start gap-4">
                    <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-baseline gap-2">
                        <h3 className="font-semibold">BiPRM Research</h3>
                        <a
                          href="https://arxiv.org/abs/2508.01682"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          arxiv:2508.01682
                        </a>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        31.9% more accurate than unidirectional verification
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-5">
                  <div className="flex items-start gap-4">
                    <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-baseline gap-2">
                        <h3 className="font-semibold">Ensemble Methods</h3>
                        <a
                          href="https://arxiv.org/abs/2411.06535"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          arxiv:2411.06535
                        </a>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        3 diverse models raise precision from 73% to 95.6%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="w-full py-20 md:py-28" id="pricing">
          <div className="container">
            <div className="mx-auto max-w-[1000px]">
              <div className="mb-16 text-center">
                <h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
                  Transparent pricing
                </h2>
                <p className="text-lg text-muted-foreground">
                  Bring your own API keys. No token markups. Just platform access.
                </p>
              </div>
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="flex flex-col rounded-xl border bg-card p-6">
                  <div className="mb-6">
                    <h3 className="mb-1 text-xl font-semibold">Free</h3>
                    <p className="text-sm text-muted-foreground">For testing</p>
                  </div>
                  <div className="mb-6">
                    <div className="text-4xl font-bold">$0</div>
                  </div>
                  <ul className="mb-6 flex-1 space-y-2.5">
                    <li className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>100 verifications/month</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>Semantic method</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>API access</span>
                    </li>
                  </ul>
                  <Button variant="outline" asChild>
                    <Link href="#waitlist">Join beta</Link>
                  </Button>
                </div>

                <div className="flex flex-col rounded-xl border-2 border-primary bg-card p-6 shadow-lg">
                  <div className="mb-6">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-xl font-semibold">Pro</h3>
                      <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                        Popular
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">For production</p>
                  </div>
                  <div className="mb-6">
                    <div className="text-4xl font-bold">$99-299</div>
                    <div className="text-sm text-muted-foreground">/month</div>
                  </div>
                  <ul className="mb-6 flex-1 space-y-2.5">
                    <li className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>
                        <strong>Unlimited</strong> verifications
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>All 7 methods</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>Custom weighting</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>
                        <strong>BYOK</strong> (no markup)
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>Priority support</span>
                    </li>
                  </ul>
                  <Button asChild>
                    <Link href="#waitlist">Join beta</Link>
                  </Button>
                </div>

                <div className="flex flex-col rounded-xl border bg-card p-6">
                  <div className="mb-6">
                    <h3 className="mb-1 text-xl font-semibold">Enterprise</h3>
                    <p className="text-sm text-muted-foreground">For scale</p>
                  </div>
                  <div className="mb-6">
                    <div className="text-4xl font-bold">Custom</div>
                  </div>
                  <ul className="mb-6 flex-1 space-y-2.5">
                    <li className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>Everything in Pro</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>Custom SLAs</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>White-label option</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>Custom methods</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>Dedicated support</span>
                    </li>
                  </ul>
                  <Button variant="outline" asChild>
                    <Link href="#waitlist">Contact sales</Link>
                  </Button>
                </div>
              </div>
              <div className="mt-12 text-center">
                <p className="text-sm text-muted-foreground">
                  One avoided incident pays for years of the platform
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section / Waitlist */}
        <section className="w-full border-y bg-muted/30 py-20 md:py-28" id="waitlist">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-10 space-y-4">
                <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">Join the beta</h2>
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
              <div className="grid gap-8 text-center sm:grid-cols-3">
                <div>
                  <div className="mb-2 font-semibold">Extended free tier</div>
                  <p className="text-sm text-muted-foreground">for early adopters</p>
                </div>
                <div>
                  <div className="mb-2 font-semibold">Shape the product</div>
                  <p className="text-sm text-muted-foreground">direct feature input</p>
                </div>
                <div>
                  <div className="mb-2 font-semibold">Lock in beta pricing</div>
                  <p className="text-sm text-muted-foreground">when we launch</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex w-full flex-col items-center gap-6 border-t px-6 py-12 sm:flex-row md:px-8">
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
      </footer>
    </div>
  );
}
