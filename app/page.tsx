import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export const revalidate = 3600;

const METHODS = [
  { key: 'semantic', name: 'Semantic', latency: '<15ms', fpr: '~20-30%' },
  { key: 'entropy', name: 'Entropy', latency: '<100ms', fpr: '~8-10%' },
  { key: 'tool', name: 'Tool', latency: '1-2s', fpr: '~1%' },
  { key: 'reasoning', name: 'Reasoning', latency: '2-5s', fpr: '~4-5%' },
  { key: 'biprm', name: 'BiPRM', latency: '2-3.5s', fpr: '~5-7%' },
  { key: 'ensemble', name: 'Ensemble', latency: '5-12s', fpr: '~15-20%' },
  { key: 'formal', name: 'Formal', latency: 'Variable', fpr: '0%' },
] as const;

const TEAM = [
  {
    name: 'Justin Tan',
    title: 'CEO',
    bio: 'Drove $35M revenue solutions at Mastercard. Built $19M RFP bundles covering risk and compliance at West Monroe.',
  },
  {
    name: 'Michael Chen',
    title: 'CTO',
    bio: 'AI Software Engineer at Epoch, building autonomous coding agents. Previously built $5M DOD-funded sensor systems with zero downtime.',
  },
];

export default function LandingPage() {
  return (
    <div className="relative z-[1] flex min-h-[100dvh] flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md">
        <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link className="flex items-center gap-2.5" href="/">
            <Image src="/logo.svg" alt="Check" width={28} height={28} />
            <span className="text-lg font-semibold tracking-tight">Check</span>
          </Link>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
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
              <Link href="/signup">Get API key</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — centered, demo-first */}
        <section className="pb-20 pt-16 lg:pb-28 lg:pt-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="mb-6 text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
                Your AI is confidently wrong{' '}
                <span className="text-primary">15%</span>{' '}
                of the time
              </h1>

              <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
                Check catches hallucinations before they reach your users. Seven
                verification methods, one API call. You pick the speed/accuracy tradeoff.
              </p>

              <Button size="lg" asChild>
                <Link href="/signup">Get your API key</Link>
              </Button>
            </div>

            {/* Demo — POST /v1/verify */}
            <div className="mx-auto mt-12 max-w-3xl">
              <div className="overflow-hidden rounded-xl border border-border/60 bg-[#1a1a1a]">
                <div className="border-b border-white/10 px-5 py-3">
                  <span className="font-mono text-xs text-white/50">POST /v1/verify</span>
                </div>
                <div className="grid gap-0 md:grid-cols-2">
                  {/* Request */}
                  <div className="border-b border-white/10 p-5 md:border-b-0 md:border-r">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">Request</div>
                    <pre className="font-mono text-sm leading-relaxed">
                      <code>
                        <span className="text-white/60">{'{'}</span>{'\n'}
                        <span className="text-[#e06c75]">  &quot;content&quot;</span><span className="text-white/60">: </span><span className="text-[#98c379]">&quot;Patient should take{'\n'}    500mg aspirin daily&quot;</span><span className="text-white/60">,</span>{'\n'}
                        <span className="text-[#e06c75]">  &quot;methods&quot;</span><span className="text-white/60">: {'{'}</span>{'\n'}
                        <span className="text-[#e06c75]">    &quot;reasoning&quot;</span><span className="text-white/60">: </span><span className="text-[#d19a66]">0.5</span><span className="text-white/60">,</span>{'\n'}
                        <span className="text-[#e06c75]">    &quot;tool&quot;</span><span className="text-white/60">: </span><span className="text-[#d19a66]">0.3</span><span className="text-white/60">,</span>{'\n'}
                        <span className="text-[#e06c75]">    &quot;biprm&quot;</span><span className="text-white/60">: </span><span className="text-[#d19a66]">0.2</span>{'\n'}
                        <span className="text-white/60">  {'}'}</span>{'\n'}
                        <span className="text-white/60">{'}'}</span>
                      </code>
                    </pre>
                  </div>
                  {/* Response */}
                  <div className="p-5">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">Response</div>
                    <pre className="font-mono text-sm leading-relaxed">
                      <code>
                        <span className="text-white/60">{'{'}</span>{'\n'}
                        <span className="text-[#e06c75]">  &quot;verdict&quot;</span><span className="text-white/60">: </span><span className="text-[#e06c75]">false</span><span className="text-white/60">,</span>{'\n'}
                        <span className="text-[#e06c75]">  &quot;confidence&quot;</span><span className="text-white/60">: </span><span className="text-[#d19a66]">0.94</span><span className="text-white/60">,</span>{'\n'}
                        <span className="text-[#e06c75]">  &quot;decision&quot;</span><span className="text-white/60">: </span><span className="text-[#e06c75]">&quot;reject&quot;</span><span className="text-white/60">,</span>{'\n'}
                        <span className="text-[#e06c75]">  &quot;reasoning&quot;</span><span className="text-white/60">: </span><span className="text-[#98c379]">&quot;Dosage exceeds{'\n'}    safe limits (max 325mg)&quot;</span>{'\n'}
                        <span className="text-white/60">{'}'}</span>
                      </code>
                    </pre>
                  </div>
                </div>
                <div className="border-t border-white/10 px-5 py-2.5">
                  <span className="font-mono text-xs text-white/30">847ms · $0.003 · Methods: reasoning + tool + biprm</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Seven Methods — spectrum */}
        <section className="border-t border-border/50 bg-muted/20 py-20 lg:py-28" id="methods">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Seven methods, one API
              </h2>
              <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground">
                Each catches different errors. You weight them based on risk tolerance.
              </p>
            </div>

            {/* Desktop: horizontal spectrum */}
            <div className="hidden px-6 md:block">
              <div className="mb-6 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span>Fast</span>
                <div className="mx-4 h-px flex-1 bg-border" />
                <span>Thorough</span>
              </div>

              <div className="grid grid-cols-7 gap-3">
                {METHODS.map((m) => (
                  <div key={m.key} className="rounded-lg border border-border/60 bg-card p-4 text-center">
                    <div className="mb-2 text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.latency}</div>
                    <div className="mt-1 text-xs text-primary">{m.fpr} FPR</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile: vertical list sorted by latency */}
            <div className="space-y-2 md:hidden">
              <div className="mb-4 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span>Fast</span>
                <span>Thorough</span>
              </div>
              {METHODS.map((m) => (
                <div key={m.key} className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-3">
                  <span className="text-sm font-medium">{m.name}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-muted-foreground">{m.latency}</span>
                    <span className="text-primary">{m.fpr} FPR</span>
                  </div>
                </div>
              ))}
            </div>

            <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
              Most teams start with reasoning + tool — under 3 seconds, catches ~95% of errors.
              Add biprm or ensemble when accuracy is non-negotiable.
            </p>
          </div>
        </section>

        {/* How It Works — 3-step API walkthrough */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight sm:text-4xl">
              How it works
            </h2>

            <div className="mx-auto max-w-3xl space-y-12">
              {/* Step 1 */}
              <div>
                <div className="mb-4 flex items-baseline justify-center gap-3">
                  <span className="text-sm font-medium text-primary">1</span>
                  <h3 className="text-lg font-medium">POST your AI output with method weights</h3>
                </div>
                <pre className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-5 font-mono text-sm">
                  <code className="text-foreground">{`curl -X POST https://api.checkapi.ai/v1/verify \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "content": "Patient should take 500mg aspirin daily",
    "methods": { "reasoning": 0.5, "tool": 0.3, "biprm": 0.2 }
  }'`}</code>
                </pre>
              </div>

              {/* Step 2 */}
              <div>
                <div className="mb-4 flex items-baseline justify-center gap-3">
                  <span className="text-sm font-medium text-primary">2</span>
                  <h3 className="text-lg font-medium">Get back a verdict with confidence and reasoning</h3>
                </div>
                <pre className="overflow-x-auto rounded-xl border border-destructive/20 bg-destructive/5 p-5 font-mono text-sm">
                  <code className="text-foreground">{`{
  "verdict": false,
  "confidence": 0.94,
  "decision": "reject",
  "reasoning": "Dosage exceeds safe limits (max 325mg)"
}`}</code>
                </pre>
              </div>

              {/* Step 3 */}
              <div>
                <div className="mb-4 flex items-baseline justify-center gap-3">
                  <span className="text-sm font-medium text-primary">3</span>
                  <h3 className="text-lg font-medium">Route on the decision</h3>
                </div>
                <pre className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-5 font-mono text-sm">
                  <code className="text-foreground">{`if (result.decision === "reject")  blockResponse();
if (result.decision === "escalate") routeToHuman();
if (result.decision === "accept")   serve(result);`}</code>
                </pre>
              </div>
            </div>

            <p className="mt-10 text-center text-sm text-muted-foreground">
              Full docs at{' '}
              <Link href="/docs" className="underline underline-offset-4 transition-colors hover:text-foreground">
                /docs
              </Link>
              {' '}— Python, Node.js, and cURL.
            </p>
          </div>
        </section>

        {/* Team */}
        <section className="border-t border-border/50 bg-muted/10 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight sm:text-4xl">
              Built by
            </h2>

            <div className="flex flex-wrap justify-center gap-8">
              {TEAM.map((person) => (
                <div key={person.name} className="flex items-start gap-4">
                  <div className="h-12 w-12 shrink-0 flex items-center justify-center rounded-full bg-muted">
                    <span className="text-sm font-medium">{person.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="font-medium">{person.name}</div>
                    <div className="text-sm text-muted-foreground">{person.title}</div>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">{person.bio}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mx-auto mt-10 max-w-xl text-center text-lg leading-relaxed text-muted-foreground">
              We spent years building AI systems at production scale.
              The hardest part wasn&apos;t making AI smart&mdash;it was trusting its outputs.
            </p>
          </div>
        </section>

        {/* Pricing */}
        <section className="border-t border-border/50 py-20 lg:py-28" id="pricing">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Pricing
              </h2>
              <p className="mx-auto max-w-lg text-lg text-muted-foreground">
                Bring your own API keys. You pay for verifications, not our margins.
              </p>
            </div>

            <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-3">
              {/* Free */}
              <div className="rounded-2xl border border-border/60 bg-card p-8">
                <div className="mb-1 text-sm font-medium text-muted-foreground">Free</div>
                <div className="mb-4 text-4xl font-semibold tracking-tight">$0</div>
                <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                  <li>1,000 verifications/month</li>
                  <li>All 7 methods</li>
                  <li>20 requests/min</li>
                  <li>7-day data retention</li>
                </ul>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/signup">Get API key</Link>
                </Button>
              </div>

              {/* Pro */}
              <div className="rounded-2xl border-2 border-primary/40 bg-card p-8">
                <div className="mb-1 text-sm font-medium text-primary">Pro</div>
                <div className="mb-1 text-4xl font-semibold tracking-tight">$99</div>
                <div className="mb-4 text-sm text-muted-foreground">/month</div>
                <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                  <li>25,000 verifications/month</li>
                  <li>All 7 methods</li>
                  <li>200 requests/min</li>
                  <li>Batch processing</li>
                  <li>Up to 5 team members</li>
                  <li>30-day data retention</li>
                </ul>
                <Button asChild className="w-full">
                  <Link href="/signup">Subscribe</Link>
                </Button>
              </div>

              {/* Enterprise */}
              <div className="rounded-2xl border border-border/60 bg-card p-8">
                <div className="mb-1 text-sm font-medium text-muted-foreground">Enterprise</div>
                <div className="mb-4 text-4xl font-semibold tracking-tight">Custom</div>
                <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                  <li>Unlimited verifications</li>
                  <li>All 7 methods</li>
                  <li>1,000 requests/min</li>
                  <li>Batch processing</li>
                  <li>Unlimited team members</li>
                  <li>90-day data retention</li>
                </ul>
                <Button variant="outline" asChild className="w-full">
                  <a href="mailto:sales@checkapi.ai">Talk to sales</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-8 sm:grid sm:grid-cols-3 sm:items-center">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Check" width={20} height={20} />
            <span className="text-sm text-muted-foreground">© 2026 Check</span>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>1,000 free verifications, no credit card.</span>
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link href="/signup">Get started</Link>
            </Button>
          </div>

          <nav className="flex justify-end gap-6">
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
