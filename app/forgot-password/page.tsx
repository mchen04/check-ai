import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';

export default function ForgotPassword() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2">
          <div className="flex justify-center pb-4">
            <Link href="/">
              <Image src="/logo.png" alt="logo" width={50} height={50} />
            </Link>
          </div>
          <CardTitle className="text-center text-2xl font-bold">Forgot Your Password?</CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we&apos;ll send you a reset link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ForgotPasswordForm />
        </CardContent>
        <CardFooter className="flex flex-col gap-2 text-center">
          <Link
            className="w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
            href="/login"
          >
            Back to login
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
