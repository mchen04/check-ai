import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Book,
  MessageCircle,
  Mail,
  FileText,
  ExternalLink,
  Key,
  PlayCircle,
  Shield,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Help & Support | Check',
  description: 'Get help with Check AI verification. Find answers to common questions and contact our support team.',
};

export default function SupportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Check logo" width={32} height={32} />
            <span className="text-lg font-semibold tracking-tight">Check</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/docs">Docs</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="container flex-1 py-12 md:py-16">
        <div className="mb-10 space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Help & Support</h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Find answers to common questions and get help with your verification workflows.
          </p>
        </div>

        <div className="mx-auto max-w-4xl space-y-8">
          {/* Quick Links */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="transition-colors hover:bg-muted/50">
              <Link href="/docs" className="block p-4">
                <div className="flex items-start gap-3">
                  <Book className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-medium text-sm">Documentation</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Complete API reference and guides
                    </p>
                  </div>
                </div>
              </Link>
            </Card>

            <Card className="transition-colors hover:bg-muted/50">
              <Link href="/dashboard/playground" className="block p-4">
                <div className="flex items-start gap-3">
                  <PlayCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-medium text-sm">Playground</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Test verifications interactively
                    </p>
                  </div>
                </div>
              </Link>
            </Card>

            <Card className="transition-colors hover:bg-muted/50">
              <Link href="/dashboard/keys" className="block p-4">
                <div className="flex items-start gap-3">
                  <Key className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-medium text-sm">API Keys</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Manage your API credentials
                    </p>
                  </div>
                </div>
              </Link>
            </Card>
          </div>

          {/* FAQ Section */}
          <Card>
            <CardHeader className="py-4 px-5">
              <CardTitle className="text-base">Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0 space-y-4">
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between py-2 text-sm font-medium hover:text-primary">
                  How do I get started with the API?
                  <svg className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="pb-2 pt-1 text-sm text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Create an API key in the <Link href="/dashboard/keys" className="text-primary hover:underline">Keys</Link> section</li>
                    <li>Add your LLM provider credentials in <Link href="/dashboard/providers" className="text-primary hover:underline">Providers</Link></li>
                    <li>Make your first API call using the documentation examples</li>
                  </ol>
                </div>
              </details>

              <details className="group border-t pt-4">
                <summary className="flex cursor-pointer items-center justify-between py-2 text-sm font-medium hover:text-primary">
                  What verification methods are available?
                  <svg className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="pb-2 pt-1 text-sm text-muted-foreground">
                  We offer multiple verification methods: Semantic, Reasoning, Ensemble, Entropy, Formal, Tool-Augmented, and BiPRM.
                  Free plans include Semantic verification. Pro and Enterprise plans unlock all methods.
                </div>
              </details>

              <details className="group border-t pt-4">
                <summary className="flex cursor-pointer items-center justify-between py-2 text-sm font-medium hover:text-primary">
                  How do I upgrade my plan?
                  <svg className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="pb-2 pt-1 text-sm text-muted-foreground">
                  Go to <Link href="/subscribe" className="text-primary hover:underline">Pricing</Link> to select a new plan,
                  or use the <strong>Billing</strong> link in your profile menu to manage your existing subscription through Stripe.
                </div>
              </details>

              <details className="group border-t pt-4">
                <summary className="flex cursor-pointer items-center justify-between py-2 text-sm font-medium hover:text-primary">
                  Where can I see my current plan and usage?
                  <svg className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="pb-2 pt-1 text-sm text-muted-foreground">
                  Your current plan is shown in <Link href="/dashboard/settings" className="text-primary hover:underline">Settings</Link> under Organization.
                  Monthly usage is displayed on your <Link href="/dashboard" className="text-primary hover:underline">Dashboard</Link> and in detail on the <Link href="/dashboard/usage" className="text-primary hover:underline">Usage</Link> page.
                </div>
              </details>
            </CardContent>
          </Card>

          {/* Contact Section */}
          <Card>
            <CardHeader className="py-4 px-5">
              <CardTitle className="text-base">Need More Help?</CardTitle>
              <CardDescription className="text-xs">Contact our support team</CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0">
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" asChild>
                  <a href="mailto:support@check.ai">
                    <Mail className="mr-2 h-4 w-4" />
                    Email Support
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/docs">
                    <FileText className="mr-2 h-4 w-4" />
                    View Documentation
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="w-full border-t">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-12 sm:flex-row">
          <p className="text-sm text-muted-foreground">© 2026 Check</p>
          <nav className="flex gap-8 sm:ml-auto">
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
