import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import SignupForm from '@/components/SignupForm';
import ProviderSigninBlock from '@/components/ProviderSigninBlock';

export default function Signup() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <Link href="/" className="mb-6">
            <Image src="/logo.svg" alt="Check logo" width={40} height={40} />
          </Link>
          <h1 className="text-2xl font-semibold">Create an account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started with Check
          </p>
        </div>

        <Card>
          <CardContent className="space-y-5 p-6">
            <SignupForm />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
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
            Already have an account? <span className="text-foreground">Sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
