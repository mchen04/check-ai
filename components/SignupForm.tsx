'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signup } from '@/app/auth/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" type="submit" disabled={pending}>
      {pending ? 'Signing up...' : 'Sign Up'}
    </Button>
  );
}

export default function SignupForm() {
  const initialState = {
    message: '',
  };

  const [formState, formAction] = useFormState(signup, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" type="text" placeholder="John Doe" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="m@example.com" name="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" name="password" required minLength={6} />
      </div>
      <SubmitButton />
      {formState?.message && (
        <p className="text-center text-sm text-destructive">{formState.message}</p>
      )}
    </form>
  );
}
