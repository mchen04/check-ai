import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import Link from 'next/link'
import Image from 'next/image'
import { Button } from "@/components/ui/button"

export default function SubscribeSuccess() {
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
                        Welcome Aboard!
                    </CardTitle>
                    <CardDescription className="text-center">
                        Thank you for subscribing! Your account has been set up and you&apos;re ready to go.
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button className="w-full" size="lg" asChild>
                        <Link href="/dashboard">
                            Go to Dashboard
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
