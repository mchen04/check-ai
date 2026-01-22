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
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2">
          <div className="flex justify-center pb-4">
            <Link href="/">
              <Image src="/logo.svg" alt="logo" width={50} height={50} />
            </Link>
          </div>
          <CardTitle className="text-center text-2xl font-bold">Sign Up</CardTitle>
          <CardDescription className="text-center">Create your account now!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SignupForm />
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
            href="/login"
          >
            Have an account? Log in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
