import { Card, CardHeader, CardTitle, CardDescription, CardFooter, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Subscription Successful | Check',
  description: 'Thank you for subscribing to Check. Your account is now active.',
};

export default function SubscribeSuccess() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-4">
          <div className="flex justify-center pb-2">
            <Link href="/">
              <Image src="/logo.svg" alt="Check logo" width={50} height={50} />
            </Link>
          </div>
          <div className="flex justify-center">
            <CheckCircle className="h-12 w-12 text-success" />
          </div>
          <CardTitle className="text-center text-2xl font-bold">Welcome Aboard!</CardTitle>
          <CardDescription className="text-center">
            Thank you for subscribing! Your account has been set up and you&apos;re ready to go.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>Your new plan is now active. You can view your subscription details in Settings or manage billing anytime.</p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full" size="lg" asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link href="/dashboard/settings">View Plan Details</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
