'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { demoLogin } from '@/app/auth/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" type="submit" disabled={pending}>
      {pending ? 'Accessing...' : 'Access Demo'}
    </Button>
  );
}

export default function DemoPasswordForm() {
  const initialState = {
    message: '',
  };

  const [formState, formAction] = useFormState(demoLogin, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Demo Password</Label>
        <Input id="password" type="password" name="password" required placeholder="Enter demo password" />
      </div>
      <SubmitButton />
      {formState?.message && (
        <p className="text-center text-sm text-destructive">{formState.message}</p>
      )}
    </form>
  );
}
