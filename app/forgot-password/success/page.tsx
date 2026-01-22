import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ForgotPasswordSuccess() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-4">
          <div className="flex justify-center pb-4">
            <Link href="/">
              <Image src="/logo.svg" alt="logo" width={50} height={50} />
            </Link>
          </div>
          <CardTitle className="text-center text-2xl font-bold">Check Your Email</CardTitle>
          <CardDescription className="text-center">
            We&apos;ve sent a password reset link to your email address. Please check your inbox and
            follow the instructions.
          </CardDescription>
          <div className="pt-4 text-center">
            <Link
              href="/login"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to login
            </Link>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
