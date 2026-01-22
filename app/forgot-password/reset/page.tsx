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
import ResetPasswordForm from '@/components/ResetPasswordForm';

export default function ResetPassword() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2">
          <div className="flex justify-center pb-4">
            <Link href="/">
              <Image src="/logo.svg" alt="logo" width={50} height={50} />
            </Link>
          </div>
          <CardTitle className="text-center text-2xl font-bold">Reset Your Password</CardTitle>
          <CardDescription className="text-center">Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
