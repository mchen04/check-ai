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
import ProviderSigninBlock from '@/components/ProviderSigninBlock';
import LoginForm from '@/components/LoginForm';

export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <Link href="/" className="mb-6">
            <Image src="/logo.svg" alt="Check logo" width={40} height={40} />
          </Link>
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        <Card>
          <CardContent className="space-y-5 p-6">
            <LoginForm />
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

        <div className="mt-6 flex flex-col items-center gap-2 text-center">
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
            Don&apos;t have an account? <span className="text-foreground">Sign up</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
