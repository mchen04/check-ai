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
      <header className="sticky top-0 z-50 flex h-16 w-full items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
        <Link className="flex items-center justify-center gap-2" href="#">
          <Shield className="h-6 w-6" />
          <span className="text-xl font-bold">VerifyAI</span>
          <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
            BETA
          </span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <a
            className="text-sm font-medium underline-offset-4 hover:underline"
            href="#problem"
          >
            Problem
          </a>
          <a className="text-sm font-medium underline-offset-4 hover:underline" href="#methods">
            Methods
          </a>
          <a
            className="text-sm font-medium underline-offset-4 hover:underline"
            href="#research"
          >
            Research
          </a>
          <a className="text-sm font-medium underline-offset-4 hover:underline" href="#pricing">
            Pricing
          </a>
        </nav>
        <Button asChild className="ml-4 md:ml-6 lg:ml-8">
          <Link href="#waitlist">Join Beta</Link>
        </Button>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-16 md:py-24 lg:py-32">
          <div className="container">
            <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
              <div className="flex w-full flex-col space-y-6 md:w-1/2">
                <div className="space-y-4">
                  <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                    Stop $2.4M Hallucination Incidents
                  </h1>
                  <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
                    Multi-method AI verification. One API, seven approaches, custom weighting.
                  </p>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    Companies are legally liable for AI hallucinations. We help you catch them
                    before deployment using research-backed verification methods.
                  </p>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Button size="lg" asChild>
                    <Link href="#waitlist">Join Beta Waitlist</Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link href="#methods">See How It Works</Link>
                  </Button>
                </div>
              </div>
              <div className="flex w-full justify-center md:w-1/2">
                <div className="w-full max-w-md rounded-lg border bg-card p-4 font-mono text-sm md:max-w-full">
                  <div className="mb-2 flex items-center gap-2 border-b pb-2 text-xs text-muted-foreground">
                    <Code className="h-4 w-4" />
                    <span>POST /v1/verify</span>
                  </div>
                  <pre className="overflow-x-auto text-xs leading-relaxed">
                    <code>{`{
  "content": "Patient should take
    500mg aspirin daily",
  "methods": {
    "reasoning": 0.5,
    "tool": 0.3,
    "biprm": 0.2
  }
}

→ Response:
{
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

        {/* Problem Cost Section */}
        <section className="w-full bg-muted py-16 md:py-24 lg:py-32" id="problem">
          <div className="container">
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              The Cost of AI Hallucinations
            </h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 rounded-lg border bg-card p-8 text-center transition-shadow hover:shadow-lg">
                <div className="rounded-full bg-destructive/10 p-4">
                  <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
                <h3 className="text-4xl font-bold">$2.4M</h3>
                <p className="leading-relaxed text-muted-foreground">
                  Average cost per major hallucination incident (malpractice, SEC violations,
                  legal sanctions)
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 rounded-lg border bg-card p-8 text-center transition-shadow hover:shadow-lg">
                <div className="rounded-full bg-primary/10 p-4">
                  <BarChart className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-4xl font-bold">78%</h3>
                <p className="leading-relaxed text-muted-foreground">
                  Of enterprises now use AI in production, moving from experiments to
                  customer-facing systems
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 rounded-lg border bg-card p-8 text-center transition-shadow hover:shadow-lg sm:col-span-2 lg:col-span-1">
                <div className="rounded-full bg-primary/10 p-4">
                  <Shield className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-4xl font-bold">$812</h3>
                <p className="leading-relaxed text-muted-foreground">
                  Air Canada settlement after chatbot invented refund policy (Feb 2024). Court
                  ruled companies are legally liable for AI outputs.
                </p>
              </div>
            </div>
            <div className="mt-12 rounded-lg border bg-card p-6 md:p-8">
              <p className="text-center text-lg leading-relaxed">
                <strong>Reality:</strong> Even GPT-5 will have an 8% error rate. Zero hallucinations
                is mathematically impossible. Every company deploying AI needs verification.{' '}
                <strong>Not optional.</strong>
              </p>
            </div>
          </div>
        </section>

        {/* Competitive Comparison */}
        <section className="w-full py-16 md:py-24 lg:py-32">
          <div className="container">
            <h2 className="mb-4 text-center text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Why Existing Solutions Fail
            </h2>
            <p className="mb-12 text-center text-lg leading-relaxed text-muted-foreground">
              All existing solutions force one verification method. Different use cases need
              different approaches.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse rounded-lg border bg-card text-sm">
                <thead>
                  <tr className="border-b bg-muted">
                    <th className="p-4 text-left font-semibold">Feature</th>
                    <th className="p-4 text-left font-semibold">Guardrails AI</th>
                    <th className="p-4 text-left font-semibold">Cleanlab</th>
                    <th className="p-4 text-left font-semibold">Harmonic</th>
                    <th className="bg-primary/5 p-4 text-left font-semibold">VerifyAI</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Multiple Methods</td>
                    <td className="p-4">
                      <X className="h-5 w-5 text-destructive" />
                    </td>
                    <td className="p-4">
                      <X className="h-5 w-5 text-destructive" />
                    </td>
                    <td className="p-4">
                      <X className="h-5 w-5 text-destructive" />
                    </td>
                    <td className="bg-primary/5 p-4">
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-success" />
                        <span className="text-xs font-semibold">7+ methods</span>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Custom Weighting</td>
                    <td className="p-4">
                      <X className="h-5 w-5 text-destructive" />
                    </td>
                    <td className="p-4">
                      <X className="h-5 w-5 text-destructive" />
                    </td>
                    <td className="p-4">
                      <X className="h-5 w-5 text-destructive" />
                    </td>
                    <td className="bg-primary/5 p-4">
                      <Check className="h-5 w-5 text-success" />
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">All Domains</td>
                    <td className="p-4">
                      <X className="h-5 w-5 text-destructive" />
                    </td>
                    <td className="p-4">
                      <X className="h-5 w-5 text-destructive" />
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-muted-foreground">Math only</span>
                    </td>
                    <td className="bg-primary/5 p-4">
                      <Check className="h-5 w-5 text-success" />
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium">Approach</td>
                    <td className="p-4 text-xs text-muted-foreground">Rule-based validators</td>
                    <td className="p-4 text-xs text-muted-foreground">Single trust score</td>
                    <td className="p-4 text-xs text-muted-foreground">Mathematical proofs</td>
                    <td className="bg-primary/5 p-4 text-xs font-semibold">
                      Multi-method platform
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* The 7 Methods */}
        <section className="w-full bg-muted py-16 md:py-24 lg:py-32" id="methods">
          <div className="container">
            <h2 className="mb-4 text-center text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              The 7 Verification Methods
            </h2>
            <p className="mb-12 text-center text-lg leading-relaxed text-muted-foreground">
              Choose the right mix for your use case. Each method has different strengths,
              speeds, and accuracy rates.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="flex flex-col transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">Semantic Similarity</CardTitle>
                  </div>
                  <CardDescription className="text-xs font-mono">
                    FPR: 50-100% • Speed: ~100ms
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    Compares embeddings for quick filtering. Fast but vulnerable to RLHF-trained
                    hallucinations.
                  </p>
                  <p className="text-xs font-semibold">Best for: Quick pre-filtering</p>
                </CardContent>
              </Card>

              <Card className="flex flex-col transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">Reasoning-Based</CardTitle>
                  </div>
                  <CardDescription className="text-xs font-mono">
                    FPR: 7% • Speed: 2-3s
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    LLM analyzes logical consistency with chain-of-thought reasoning. General
                    purpose verification.
                  </p>
                  <p className="text-xs font-semibold">Best for: General verification</p>
                </CardContent>
              </Card>

              <Card className="flex flex-col transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <Code className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">Tool-Augmented</CardTitle>
                  </div>
                  <CardDescription className="text-xs font-mono">
                    FPR: ~2% • Speed: 1-2s
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    Web search + code execution to verify factual claims. Highest accuracy for
                    verifiable facts.
                  </p>
                  <p className="text-xs font-semibold">Best for: Factual claims</p>
                </CardContent>
              </Card>

              <Card className="flex flex-col transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">BiPRM</CardTitle>
                  </div>
                  <CardDescription className="text-xs font-mono">
                    FPR: ~10% • Speed: 3-5s
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    Bidirectional reasoning verification. 31.9% more accurate than unidirectional
                    checking.
                  </p>
                  <p className="text-xs font-semibold">Best for: Medical, legal reasoning</p>
                </CardContent>
              </Card>

              <Card className="flex flex-col transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <BarChart className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">Ensemble</CardTitle>
                  </div>
                  <CardDescription className="text-xs font-mono">
                    FPR: 20-40% • Speed: 5-10s
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    Multiple models vote on verdict. Raises precision from 73% to 95.6% with 3
                    diverse models.
                  </p>
                  <p className="text-xs font-semibold">Best for: High-stakes decisions</p>
                </CardContent>
              </Card>

              <Card className="flex flex-col transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">Semantic Entropy</CardTitle>
                  </div>
                  <CardDescription className="text-xs font-mono">
                    FPR: TBD • Speed: ~200ms
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    Measures consistency across multiple generations to detect hallucination
                    patterns.
                  </p>
                  <p className="text-xs font-semibold">Best for: Hallucination detection</p>
                </CardContent>
              </Card>

              <Card className="flex flex-col border-primary/50 bg-primary/5 transition-shadow hover:shadow-lg sm:col-span-2 lg:col-span-3">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">Formal Verification</CardTitle>
                  </div>
                  <CardDescription className="text-xs font-mono">
                    FPR: 0% • Speed: Variable
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    Mathematical proofs for cryptography and smart contracts. Zero false positives
                    when applicable.
                  </p>
                  <p className="text-xs font-semibold">
                    Best for: Crypto, code verification (Coming soon)
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="w-full py-16 md:py-24 lg:py-32">
          <div className="container">
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Configure for Your Use Case
            </h2>
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="rounded-lg border bg-card p-6">
                <h3 className="mb-4 text-xl font-semibold">Medical AI</h3>
                <div className="mb-4 rounded-md bg-muted p-3 font-mono text-xs">
                  <div className="text-muted-foreground">Configuration:</div>
                  <div>60% BiPRM</div>
                  <div>30% Tool</div>
                  <div>10% Semantic</div>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Optimized for accuracy and fact-checking medical claims. Catches reasoning
                  errors while verifying against databases.
                </p>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <h3 className="mb-4 text-xl font-semibold">Legal AI</h3>
                <div className="mb-4 rounded-md bg-muted p-3 font-mono text-xs">
                  <div className="text-muted-foreground">Configuration:</div>
                  <div>50% Ensemble</div>
                  <div>50% Tool</div>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Maximum accuracy with citation verification. Ensures case law references are
                  real and properly cited.
                </p>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <h3 className="mb-4 text-xl font-semibold">Customer Support</h3>
                <div className="mb-4 rounded-md bg-muted p-3 font-mono text-xs">
                  <div className="text-muted-foreground">Configuration:</div>
                  <div>80% Reasoning</div>
                  <div>20% Semantic</div>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Balanced speed and accuracy for customer-facing applications. Quick responses
                  without sacrificing quality.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Research Foundation */}
        <section className="w-full bg-muted py-16 md:py-24 lg:py-32" id="research">
          <div className="container">
            <h2 className="mb-4 text-center text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Built on Peer-Reviewed Research
            </h2>
            <p className="mb-12 text-center text-lg leading-relaxed text-muted-foreground">
              Our verification methods are backed by published academic research, not
              hand-waving.
            </p>
            <div className="mx-auto max-w-4xl space-y-4">
              <div className="rounded-lg border bg-card p-6">
                <div className="mb-2 flex items-start gap-3">
                  <FileText className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                  <div>
                    <h3 className="mb-1 font-semibold">
                      Semantic Illusion Problem{' '}
                      <a
                        href="https://arxiv.org/abs/2512.15068"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        arxiv:2512.15068
                      </a>
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Embedding-based detection achieves 50-100% FPR on RLHF-trained outputs.
                      Validates our multi-method approach.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <div className="mb-2 flex items-start gap-3">
                  <FileText className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                  <div>
                    <h3 className="mb-1 font-semibold">
                      Process Supervision (OpenAI, ICLR 2024){' '}
                      <span className="font-mono text-xs text-muted-foreground">
                        &quot;Let&apos;s Verify Step by Step&quot;
                      </span>
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Process supervision significantly outperforms outcome-only verification.
                      78.2% accuracy on MATH dataset. Foundation for BiPRM method.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <div className="mb-2 flex items-start gap-3">
                  <FileText className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                  <div>
                    <h3 className="mb-1 font-semibold">
                      FacTool{' '}
                      <a
                        href="https://arxiv.org/abs/2307.13528"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        arxiv:2307.13528
                      </a>
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Tool-grounded verification achieves 98.97% F1 score. Web search + code
                      execution for claim verification.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <div className="mb-2 flex items-start gap-3">
                  <FileText className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                  <div>
                    <h3 className="mb-1 font-semibold">
                      BiPRM Research{' '}
                      <a
                        href="https://arxiv.org/abs/2508.01682"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        arxiv:2508.01682
                      </a>
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Bidirectional verification is 31.9% more accurate than unidirectional. First
                      application to non-math domains.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <div className="mb-2 flex items-start gap-3">
                  <FileText className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                  <div>
                    <h3 className="mb-1 font-semibold">
                      Ensemble Methods{' '}
                      <a
                        href="https://arxiv.org/abs/2411.06535"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        arxiv:2411.06535
                      </a>
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      3 diverse models raise precision from 73% to 95.6%. Cohen&apos;s kappa &gt;0.76
                      threshold for reliable consensus.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="w-full py-16 md:py-24 lg:py-32" id="pricing">
          <div className="container">
            <h2 className="mb-4 text-center text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Transparent BYOK Pricing
            </h2>
            <p className="mb-12 text-center text-lg leading-relaxed text-muted-foreground">
              Bring your own API keys. We charge for the platform, not token resale. No hidden
              markups.
            </p>
            <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="flex flex-col transition-shadow hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Free</CardTitle>
                  <CardDescription className="text-base">
                    For testing and experimentation
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="mb-6 text-4xl font-bold">$0</p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <Check className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm leading-relaxed">
                        100 verifications per month
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm leading-relaxed">Semantic method only</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm leading-relaxed">API access</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm leading-relaxed">Community support</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" size="lg" variant="outline" asChild>
                    <Link href="#waitlist">Join Beta</Link>
                  </Button>
                </CardFooter>
              </Card>

              <Card className="flex flex-col border-primary transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <CardTitle className="text-2xl">Pro</CardTitle>
                    <span className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                      POPULAR
                    </span>
                  </div>
                  <CardDescription className="text-base">
                    For production deployments
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="mb-6">
                    <span className="text-4xl font-bold">$99-299</span>
                    <span className="text-muted-foreground">/month</span>
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <Check className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm leading-relaxed">
                        <strong>Unlimited</strong> verifications
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm leading-relaxed">
                        All 7 verification methods
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm leading-relaxed">Custom method weighting</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm leading-relaxed">
                        <strong>BYOK:</strong> Your API keys, no markup
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm leading-relaxed">Priority support</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" size="lg" asChild>
                    <Link href="#waitlist">Join Beta</Link>
                  </Button>
                </CardFooter>
              </Card>

              <Card className="flex flex-col transition-shadow hover:shadow-lg sm:col-span-2 lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-2xl">Enterprise</CardTitle>
                  <CardDescription className="text-base">
                    For large-scale deployments
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="mb-6 text-4xl font-bold">Custom</p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <Check className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm leading-relaxed">Everything in Pro</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm leading-relaxed">Custom SLAs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm leading-relaxed">White-label deployment</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm leading-relaxed">
                        Custom method development
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-sm leading-relaxed">Dedicated support team</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" size="lg" variant="outline" asChild>
                    <Link href="#waitlist">Contact Sales</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                <strong>ROI:</strong> Avoid one $2.4M hallucination incident. Platform cost:{' '}
                &lt;$50K/year. Building in-house: $500K-1M/year.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section / Waitlist */}
        <section className="w-full bg-muted py-16 md:py-24 lg:py-32" id="waitlist">
          <div className="container">
            <div className="mx-auto flex max-w-3xl flex-col items-center justify-center space-y-6 text-center">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  Join the Beta
                </h2>
                <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
                  Get early access to VerifyAI. We&apos;re working with design partners in
                  healthcare, legal, and financial AI to validate our approach.
                </p>
              </div>
              <div className="w-full max-w-md space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="flex-1 rounded-md border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <Button size="lg" className="sm:w-auto">
                    Join Waitlist
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  No spam. Just updates on our beta launch and research findings.
                </p>
              </div>
              <div className="grid gap-6 pt-8 text-left sm:grid-cols-3">
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Free Beta Access</h3>
                  <p className="text-xs text-muted-foreground">
                    Early adopters get extended free tier
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Shape the Product</h3>
                  <p className="text-xs text-muted-foreground">
                    Direct input on features and methods
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Beta Pricing Lock</h3>
                  <p className="text-xs text-muted-foreground">
                    Keep your beta pricing when we launch
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex w-full shrink-0 flex-col items-center gap-4 border-t px-4 py-8 sm:flex-row md:px-6">
        <p className="text-sm text-muted-foreground">
          © 2025 VerifyAI. Built on peer-reviewed research.
        </p>
        <nav className="flex gap-6 sm:ml-auto">
          <Link className="text-sm underline-offset-4 hover:underline" href="#">
            Terms of Service
          </Link>
          <Link className="text-sm underline-offset-4 hover:underline" href="#">
            Privacy
          </Link>
          <a
            className="text-sm underline-offset-4 hover:underline"
            href="https://arxiv.org/abs/2512.15068"
            target="_blank"
            rel="noopener noreferrer"
          >
            Research
          </a>
        </nav>
      </footer>
    </div>
  );
}
