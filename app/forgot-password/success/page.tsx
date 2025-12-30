import Link from 'next/link'
import Image from 'next/image'
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function ForgotPasswordSuccess() {
    return (
        <div className="flex items-center justify-center bg-muted min-h-screen p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="space-y-4">
                    <div className="flex justify-center pb-4">
                        <Link href='/'>
                            <Image src="/logo.png" alt="logo" width={50} height={50} />
                        </Link>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">
                        Check Your Email
                    </CardTitle>
                    <CardDescription className="text-center">
                        We&apos;ve sent a password reset link to your email address. Please check your inbox and follow the instructions.
                    </CardDescription>
                    <div className="pt-4 text-center">
                        <Link
                            href="/login"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Back to login
                        </Link>
                    </div>
                </CardHeader>
            </Card>
        </div>
    )
}
