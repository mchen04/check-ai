import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/card';
import SignupForm from '@/components/SignupForm';
import ProviderSigninBlock from '@/components/ProviderSigninBlock';

export const metadata: Metadata = {
  title: 'Sign Up | Check',
  description: 'Create a free Check account. Get 1,000 free AI verifications with all 7 methods for hallucination detection.',
};

export default function Signup() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Subtle gradient background */}
      <div className="bg-auth-gradient pointer-events-none fixed inset-0 opacity-30" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <Link href="/" className="mb-6 transition-opacity hover:opacity-80">
            <Image src="/logo.svg" alt="Check" width={40} height={40} />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Get started with Check</p>
        </div>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="space-y-5 p-6">
            <SignupForm />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <ProviderSigninBlock />
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            href="/login"
          >
            Already have an account?{' '}
            <span className="font-medium text-primary">Sign in</span>
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing up, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
