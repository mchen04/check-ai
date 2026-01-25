import Link from 'next/link';
import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Terms of Service | Check',
  description: 'Terms of Service for Check - The Stripe for LLM Verification',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Check logo" width={32} height={32} />
            <span className="text-lg font-semibold tracking-tight">Check</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to home
        </Link>

        <h1 className="mb-4 text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mb-12 text-muted-foreground">Last updated: January 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Check (&quot;Service&quot;), you agree to be bound by these
            Terms of Service. If you do not agree to these terms, do not use the Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Check provides AI-powered content verification services through an API and web
            dashboard. The Service is currently in beta and subject to change.
          </p>

          <h2>3. Account Registration</h2>
          <p>To use the Service, you must:</p>
          <ul>
            <li>Provide accurate and complete registration information</li>
            <li>Maintain the security of your account credentials and API keys</li>
            <li>Promptly notify us of any unauthorized account access</li>
            <li>Be at least 18 years old or have parental consent</li>
          </ul>

          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to circumvent rate limits or usage quotas</li>
            <li>Reverse engineer or attempt to extract source code</li>
            <li>Share API keys with unauthorized parties</li>
            <li>Submit malicious content or attempt to compromise the Service</li>
          </ul>

          <h2>5. API Usage and Rate Limits</h2>
          <p>
            Your use of the API is subject to rate limits and usage quotas based on your
            subscription plan. Exceeding these limits may result in temporary service restrictions.
          </p>

          <h2>6. Payment Terms</h2>
          <p>
            Paid subscriptions are billed monthly or annually. All fees are non-refundable except
            as required by law. We reserve the right to modify pricing with 30 days notice.
          </p>

          <h2>7. Intellectual Property</h2>
          <p>
            The Service and its original content, features, and functionality are owned by
            Check and are protected by international copyright, trademark, and other
            intellectual property laws.
          </p>

          <h2>8. Disclaimer of Warranties</h2>
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT
            GUARANTEE THAT VERIFICATION RESULTS WILL BE ACCURATE, COMPLETE, OR ERROR-FREE.
            VERIFICATION RESULTS SHOULD NOT BE THE SOLE BASIS FOR CRITICAL DECISIONS.
          </p>

          <h2>9. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, CHECK SHALL NOT BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR
            USE OF THE SERVICE.
          </p>

          <h2>10. Termination</h2>
          <p>
            We may terminate or suspend your account at any time for violations of these terms.
            Upon termination, your right to use the Service will immediately cease.
          </p>

          <h2>11. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. We will notify users of
            material changes via email or through the Service.
          </p>

          <h2>12. Contact</h2>
          <p>
            For questions about these Terms, contact us at{' '}
            <a href="mailto:legal@check.ai">legal@check.ai</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
