import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/card';
import ProviderSigninBlock from '@/components/ProviderSigninBlock';
import LoginForm from '@/components/LoginForm';

export const metadata: Metadata = {
  title: 'Log In | Check',
  description: 'Sign in to your Check account to access AI verification tools and manage your API keys.',
};

export default function Login() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Subtle gradient background */}
      <div className="bg-auth-gradient pointer-events-none fixed inset-0 opacity-30" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <Link href="/" className="mb-6 transition-opacity hover:opacity-80">
            <Image src="/logo.svg" alt="Check" width={40} height={40} priority />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="space-y-5 p-6">
            <LoginForm />
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

        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <Link
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
          <Link
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            href="/signup"
          >
            Don&apos;t have an account?{' '}
            <span className="font-medium text-primary">Sign up</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
