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
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2">
          <div className="flex justify-center pb-4">
            <Link href="/">
              <Image src="/logo.png" alt="logo" width={50} height={50} />
            </Link>
          </div>
          <CardTitle className="text-center text-2xl font-bold">Login</CardTitle>
          <CardDescription className="text-center">
            Choose your preferred login method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LoginForm />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          <ProviderSigninBlock />
        </CardContent>
        <CardFooter className="flex flex-col gap-2 text-center">
          <Link
            className="w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
          <Link
            className="w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
            href="/signup"
          >
            Don&apos;t have an account? Sign up
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
