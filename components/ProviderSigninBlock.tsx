import { FaGoogle, FaGithub } from "react-icons/fa";
import { signInWithGithub, signInWithGoogle } from '@/app/auth/actions'
import { Button } from "@/components/ui/button"
export default function ProviderSigninBlock() {
    const isGoogleEnabled = process.env.GOOGLE_OAUTH_CLIENT_ID ? true : false
    const isGithubEnabled = process.env.GITHUB_OAUTH_CLIENT_ID ? true : false
    return (
        <>
            <div className="flex flex-row gap-4">
                {isGoogleEnabled && (
                    <form action={signInWithGoogle} className="flex-1">
                        <Button variant="outline" aria-label="Sign in with Google" type="submit" className="w-full">
                            <FaGoogle className="h-4 w-4" />
                        </Button>
                    </form>
                )}
                {isGithubEnabled && (
                    <form action={signInWithGithub} className="flex-1">
                        <Button variant="outline" aria-label="Sign in with Github" type="submit" className="w-full">
                            <FaGithub className="h-4 w-4" />
                        </Button>
                    </form>
                )}
            </div>
        </>
    )
}