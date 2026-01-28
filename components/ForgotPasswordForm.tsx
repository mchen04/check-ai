'use client';
import { useFormState } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgotPassword } from '@/app/auth/actions';

export default function ForgotPasswordForm() {
  const initialState = {
    message: '',
  };
  const [formState, formAction] = useFormState(forgotPassword, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="m@example.com" name="email" required />
      </div>
      <Button className="w-full" type="submit">
        Send Reset Link
      </Button>
      {formState?.message && (
        <p className="text-center text-sm text-destructive">{formState.message}</p>
      )}
    </form>
  );
}
