import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Password Reset Successful | Check',
  description: 'Your password has been successfully reset. You can now log in.',
};

export default function ResetPasswordSuccess() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-4">
          <div className="flex justify-center pb-4">
            <Link href="/">
              <Image src="/logo.svg" alt="Check logo" width={50} height={50} />
            </Link>
          </div>
          <CardTitle className="text-center text-2xl font-bold">
            Password Reset Successful!
          </CardTitle>
          <CardDescription className="text-center">
            Your password has been successfully reset. You can now log in with your new password.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="w-full" asChild>
            <Link href="/login">Go to Login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
