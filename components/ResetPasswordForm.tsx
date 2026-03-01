'use client';
import { useState } from 'react';
import { useFormState } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPassword } from '@/app/auth/actions';

function GetCodeHiddenInput() {
  const searchParams = useSearchParams();
  return <Input type="hidden" name="code" value={searchParams.get('code')!} />;
}

export default function ResetPasswordForm() {
  const initialState = {
    message: '',
  };
  const [formState, formAction] = useFormState(resetPassword, initialState);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState(false);

  const mismatch = touched && confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter new password"
            name="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirm Password</Label>
          <Input
            id="confirm_password"
            type="password"
            placeholder="Confirm password"
            name="confirm_password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onBlur={() => setTouched(true)}
          />
          {mismatch && (
            <p className="text-sm text-destructive">Passwords do not match</p>
          )}
        </div>
        <Suspense>
          <GetCodeHiddenInput />
        </Suspense>
      </div>
      <Button className="w-full" type="submit" disabled={mismatch || !password || !confirmPassword}>
        Update Password
      </Button>
      {formState?.message && (
        <p className="text-center text-sm text-destructive">{formState.message}</p>
      )}
    </form>
  );
}
