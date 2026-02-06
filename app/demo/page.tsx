import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/card';
import DemoPasswordForm from '@/components/DemoPasswordForm';

export const metadata: Metadata = {
  title: 'Demo Access | Check',
  description: 'Enter the demo password to explore Check AI verification tools.',
};

export default function DemoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Subtle gradient background */}
      <div className="bg-auth-gradient pointer-events-none fixed inset-0 opacity-30" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <Link href="/" className="mb-6 transition-opacity hover:opacity-80">
            <Image src="/logo.svg" alt="Check" width={40} height={40} />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Demo Access</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter the demo password to explore Check</p>
        </div>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="space-y-5 p-6">
            <DemoPasswordForm />
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <Link
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            href="/signup"
          >
            Want your own account?{' '}
            <span className="font-medium text-primary">Sign up</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
