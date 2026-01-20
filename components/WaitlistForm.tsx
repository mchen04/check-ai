'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-reset success state after 3 seconds
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => setStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();

    // Client-side validation
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setStatus('error');
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to join waitlist');
      }

      setStatus('success');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setErrorMessage(getErrorMessage(err, 'Something went wrong'));
    }
  };

  if (status === 'success') {
    return (
      <div
        className="mb-10 flex items-center justify-center gap-3 rounded-lg border border-white/20 bg-white/5 px-6 py-4"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 className="h-5 w-5 text-green-400" aria-hidden="true" />
        <span className="text-white">You&apos;re on the list! We&apos;ll be in touch soon.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-10">
      <div className="flex flex-col gap-4 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          aria-label="Email address"
          aria-invalid={status === 'error'}
          aria-describedby={status === 'error' ? 'waitlist-error' : undefined}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-6 py-4 text-base text-white backdrop-blur-sm placeholder:text-white/40 focus-visible:border-white/30 focus-visible:outline-none focus-visible:ring-0"
        />
        <Button
          type="submit"
          size="lg"
          disabled={status === 'loading'}
          className="bg-white text-foreground hover:bg-white/90 sm:w-auto"
        >
          {status === 'loading' ? 'Joining...' : 'Join waitlist'}
        </Button>
      </div>
      {status === 'error' && (
        <p
          id="waitlist-error"
          role="alert"
          className="mt-3 text-center text-sm text-red-400"
        >
          {errorMessage}
        </p>
      )}
    </form>
  );
}
