import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Reset Password | Check',
  description: 'Reset your Check account password. Enter your email to receive a password reset link.',
};

export default function ForgotPassword() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <Link href="/" className="mb-6">
            <Image src="/logo.svg" alt="Check logo" width={40} height={40} />
          </Link>
          <h1 className="text-2xl font-semibold">Reset password</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <Card>
          <CardContent className="space-y-5 p-6">
            <ForgotPasswordForm />
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <Link
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            href="/login"
          >
            Back to sign in
          </Link>
          <Link
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            href="/signup"
          >
            Don&apos;t have an account? <span className="text-foreground">Sign up</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
