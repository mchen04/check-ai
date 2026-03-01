import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Check Your Email | Check',
  description: 'If this email is not yet registered, a confirmation email has been sent.',
};

export default function CheckEmail() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-4">
          <div className="flex justify-center pb-4">
            <Link href="/">
              <Image src="/logo.svg" alt="Check logo" width={50} height={50} />
            </Link>
          </div>
          <CardTitle className="text-center text-2xl font-bold">Check Your Email</CardTitle>
          <CardDescription className="text-center">
            If this email is not yet registered, a confirmation link has been sent. Please check your
            inbox and follow the instructions.
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
