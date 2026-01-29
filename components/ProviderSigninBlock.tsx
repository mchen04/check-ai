import { Chrome, Github } from 'lucide-react';
import { signInWithGithub, signInWithGoogle } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';

export default function ProviderSigninBlock() {
  const isGoogleEnabled = Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID);
  const isGithubEnabled = Boolean(process.env.GITHUB_OAUTH_CLIENT_ID);

  return (
    <div className="flex flex-row gap-4">
      {isGoogleEnabled ? (
        <form action={signInWithGoogle} className="flex-1">
          <Button
            variant="outline"
            aria-label="Sign in with Google"
            type="submit"
            className="w-full"
          >
            <Chrome className="h-4 w-4" />
          </Button>
        </form>
      ) : null}
      {isGithubEnabled ? (
        <form action={signInWithGithub} className="flex-1">
          <Button
            variant="outline"
            aria-label="Sign in with Github"
            type="submit"
            className="w-full"
          >
            <Github className="h-4 w-4" />
          </Button>
        </form>
      ) : null}
    </div>
  );
}
