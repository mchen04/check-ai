import Link from 'next/link';
import { Shield, Zap, Code, Activity, BarChart, FileText, Check, CheckCircle, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Stripe from 'stripe';
import { Button } from '@/components/ui/button';

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
            {process.env.DEMO_PASSWORD && (
              <Button asChild variant="outline" size="sm">
                <Link href="/demo">Try Demo</Link>
              </Button>
            )}
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
                <h1 className="mb-6 text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem]">
                  Your AI is confidently wrong{' '}
                  <span className="text-primary">15%</span>{' '}
                  of the time
                </h1>

                <p className="mb-8 max-w-lg text-lg leading-relaxed text-muted-foreground">
                  We built 7 different ways to catch hallucinations. Mix and match them depending on whether you need speed or precision.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" asChild className="gap-2">
                    <Link href="/signup">
                      Try 100 free verifications
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link href="#methods">See how it works</Link>
                  </Button>
                </div>

                {/* Trust indicators */}
                <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>No credit card</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Works with any LLM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Response in &lt;200ms</span>
                  </div>
                </div>
              </div>

              {/* Right: Code Example */}
              <div className="relative lg:pl-8">
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  <div className="overflow-hidden rounded-xl border border-border/60 bg-[#1a1a1a] shadow-2xl">
                    {/* Window chrome */}
                    <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3" aria-hidden="true">
                      <div className="h-3 w-3 rounded-full bg-[#ff5f57]" title="Close" />
                      <div className="h-3 w-3 rounded-full bg-[#febc2e]" title="Minimize" />
                      <div className="h-3 w-3 rounded-full bg-[#28c840]" title="Maximize" />
                      <span className="ml-3 text-xs text-white/40">verify.ts</span>
                    </div>
                    {/* Code content */}
                    <div className="p-5 font-mono text-sm leading-relaxed">
                      <div className="text-white/40">{/* Verify any AI output in one line */}{'// Verify any AI output in one line'}</div>
                      <div className="mt-3">
                        <span className="text-[#c678dd]">const</span>
                        <span className="text-white"> result </span>
                        <span className="text-[#c678dd]">=</span>
                        <span className="text-[#c678dd]"> await</span>
                        <span className="text-[#61afef]"> check</span>
                        <span className="text-white">.</span>
                        <span className="text-[#61afef]">verify</span>
                        <span className="text-white">(</span>
                        <span className="text-[#98c379]">aiOutput</span>
                        <span className="text-white">);</span>
                      </div>
                      <div className="mt-6 rounded-lg bg-white/5 p-4">
                        <div className="text-white/40 mb-2">{/* Response */}{'// Response'}</div>
                        <div className="text-white">{'{'}</div>
                        <div className="ml-4">
                          <span className="text-[#e06c75]">verified</span>
                          <span className="text-white">: </span>
                          <span className="text-[#d19a66]">false</span>
                          <span className="text-white">,</span>
                        </div>
                        <div className="ml-4">
                          <span className="text-[#e06c75]">confidence</span>
                          <span className="text-white">: </span>
                          <span className="text-[#d19a66]">0.94</span>
                          <span className="text-white">,</span>
                        </div>
                        <div className="ml-4">
                          <span className="text-[#e06c75]">reason</span>
                          <span className="text-white">: </span>
                          <span className="text-[#98c379]">&quot;Dosage exceeds safe limit&quot;</span>
                        </div>
                        <div className="text-white">{'}'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Context Section - Story-driven */}
        <section className="relative border-y border-border/50 bg-muted/30 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xl leading-relaxed text-foreground sm:text-2xl">
                Enterprise AI systems hallucinate on{' '}
                <span className="font-semibold text-primary">8-15% of queries</span>.
                In regulated industries, a single wrong answer can cost{' '}
                <span className="font-semibold">$2.4M in liability</span>.
                Manual review doesn&apos;t scale.
              </p>
              <p className="mt-4 text-lg text-muted-foreground">
                That&apos;s why we built Check.
              </p>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Medical AI and customer support need different guardrails
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground">
                A wrong medical dosage and a slightly off refund policy aren&apos;t the same risk. Your verification should know the difference.
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
                    Same guardrails for medical advice and marketing copy
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                    Rebuild from scratch for every new use case
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                    Choose between slow-and-accurate or fast-and-risky
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
                    Dial up accuracy for medical, speed for support
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-primary" />
                    One API for every domain you ship to
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-primary" />
                    You choose the tradeoff, not us
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Why We Built This - Founder credibility */}
        <section className="border-t border-border/50 bg-muted/10 py-12 lg:py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-lg italic leading-relaxed text-muted-foreground">
                &ldquo;We spent 3 years building AI systems at production scale. The hardest part wasn&apos;t making AI smart&mdash;it was trusting its outputs. Every deployment was a liability question. We built Check because we needed it ourselves.&rdquo;
              </p>
            </div>
          </div>
        </section>

        {/* The 7 Methods */}
        <section className="border-t border-border/50 bg-muted/20 py-20 lg:py-28" id="methods">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-16">
              <h2 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Seven ways to catch mistakes
              </h2>
              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                Each method catches different types of errors. Combine them based on your risk tolerance.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <MethodCard
                icon={<Zap className="h-5 w-5" />}
                title="Semantic Similarity"
                description="Fast first-pass check. Catches obvious errors instantly."
                speed="~100ms"
                bestFor="High-volume screening"
              />
              <MethodCard
                icon={<Activity className="h-5 w-5" />}
                title="Reasoning-Based"
                description="Asks 'does this make sense?' step by step."
                speed="2-3s"
                bestFor="General accuracy"
              />
              <MethodCard
                icon={<Code className="h-5 w-5" />}
                title="Tool-Augmented"
                description="Looks up facts in real-time. Best for claims about the world."
                speed="1-2s"
                bestFor="Factual claims"
              />
              <MethodCard
                icon={<Shield className="h-5 w-5" />}
                title="BiPRM"
                description="Reasons forward and backward. Catches subtle logical errors."
                speed="3-5s"
                bestFor="Complex reasoning"
              />
              <MethodCard
                icon={<BarChart className="h-5 w-5" />}
                title="Ensemble"
                description="Multiple AI models vote. Disagreement means flag it."
                speed="5-10s"
                bestFor="Critical decisions"
              />
              <MethodCard
                icon={<CheckCircle className="h-5 w-5" />}
                title="Semantic Entropy"
                description="Asks the same question multiple ways. Inconsistency means hallucination."
                speed="~200ms"
                bestFor="Uncertainty detection"
              />
              <MethodCard
                icon={<FileText className="h-5 w-5" />}
                title="Formal Verification"
                description="Mathematical proof that it's correct. Zero false positives."
                speed="Variable"
                bestFor="Absolute certainty"
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
                  Ship in 10 lines of code
                </h2>
                <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
                  POST your AI output. Get back pass/fail, confidence score, and reasoning. That&apos;s it.
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
                Pricing that makes sense
              </h2>
              <p className="mx-auto max-w-lg text-lg text-muted-foreground">
                Bring your own API keys. We don&apos;t mark up tokens. You pay for verifications, not our margins.
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
                  <span className="whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Recommended
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
                  See if your AI is hallucinating
                </h2>
                <p className="mx-auto mb-8 max-w-md text-lg text-background/70">
                  100 free verifications. No credit card. Results in under a second.
                </p>

                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button size="lg" className="bg-background text-foreground hover:bg-background/90" asChild>
                    <Link href="/signup">Start free verification</Link>
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
  bestFor,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  speed: string;
  bestFor: string;
  badge?: string;
}) {
  return (
    <div className="group rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-border hover:shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </div>
      <h3 className="mb-2 font-medium">{title}</h3>
      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">{speed}</span>
        <span className="text-xs text-muted-foreground">•</span>
        <span className="text-xs text-primary font-medium">{bestFor}</span>
        {badge && (
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
