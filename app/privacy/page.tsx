import Link from 'next/link';
import type { Metadata } from 'next';
import { Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Check',
  description: 'Privacy Policy for Check - The Stripe for LLM Verification',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Check</span>
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

        <h1 className="mb-4 text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mb-12 text-muted-foreground">Last updated: January 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <h2>1. Information We Collect</h2>

          <h3>Account Information</h3>
          <ul>
            <li>Email address</li>
            <li>Name</li>
            <li>Organization name</li>
            <li>Payment information (processed by Stripe)</li>
          </ul>

          <h3>Usage Data</h3>
          <ul>
            <li>API call logs and metadata</li>
            <li>Verification requests and results</li>
            <li>Token usage and billing information</li>
          </ul>

          <h3>Content Data</h3>
          <p>
            Content submitted for verification is processed by our systems and third-party AI
            providers. By default, we retain content for 30 days for debugging and support
            purposes. You can request immediate deletion.
          </p>

          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To provide and maintain the Service</li>
            <li>To process your verification requests</li>
            <li>To manage your account and billing</li>
            <li>To send important service updates</li>
            <li>To improve our verification algorithms</li>
            <li>To detect and prevent fraud or abuse</li>
          </ul>

          <h2>3. Data Sharing</h2>

          <h3>AI Providers</h3>
          <p>
            We share content with AI providers (OpenAI, Anthropic, Google) solely for processing
            verification requests. These providers have their own privacy policies and data
            handling practices.
          </p>

          <h3>Service Providers</h3>
          <ul>
            <li>Stripe (payment processing)</li>
            <li>Supabase (authentication and database)</li>
            <li>Vercel (hosting)</li>
            <li>Resend (email delivery)</li>
          </ul>

          <h3>Legal Requirements</h3>
          <p>
            We may disclose information when required by law, court order, or to protect our
            rights and safety.
          </p>

          <h2>4. Data Security</h2>
          <ul>
            <li>All data is encrypted in transit (TLS 1.3)</li>
            <li>Sensitive data is encrypted at rest (AES-256)</li>
            <li>API keys are hashed and never stored in plain text</li>
            <li>Regular security audits and penetration testing</li>
          </ul>

          <h2>5. Data Retention</h2>
          <ul>
            <li>Account data: Retained until account deletion</li>
            <li>Verification content: 30 days by default</li>
            <li>Usage logs: 90 days</li>
            <li>Billing records: 7 years (legal requirement)</li>
          </ul>

          <h2>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data in a portable format</li>
            <li>Opt out of marketing communications</li>
          </ul>

          <h2>7. Cookies</h2>
          <p>
            We use essential cookies for authentication and session management. We do not use
            tracking cookies or third-party advertising cookies.
          </p>

          <h2>8. International Transfers</h2>
          <p>
            Your data may be transferred to and processed in the United States. We use
            appropriate safeguards for international data transfers.
          </p>

          <h2>9. Children&apos;s Privacy</h2>
          <p>
            The Service is not intended for users under 18. We do not knowingly collect
            information from children.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this policy periodically. We will notify you of material changes via
            email or through the Service.
          </p>

          <h2>11. Contact Us</h2>
          <p>
            For privacy-related inquiries, contact us at{' '}
            <a href="mailto:privacy@check.ai">privacy@check.ai</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
