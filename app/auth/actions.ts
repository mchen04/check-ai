'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { after } from 'next/server';
import { eq } from 'drizzle-orm';
import { createClient } from '@/utils/supabase/server';
import { createStripeCustomer } from '@/utils/stripe/api';
import { db } from '@/utils/db/db';
import { usersTable } from '@/utils/db/schema';
import { createDefaultOrganization } from '@/lib/org/create-org';
import { sendWelcomeEmail } from '@/lib/email';
import { createLogger } from '@/lib/logger';
import { checkPublicRateLimit } from '@/lib/cache';

const log = createLogger('Auth');

const PUBLIC_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3001';

// Rate limit configuration for auth endpoints
const AUTH_RATE_LIMITS = {
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  signup: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  forgotPassword: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  resetPassword: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
};

/**
 * Get client IP for rate limiting
 */
async function getClientIP(): Promise<string> {
  const headersList = await headers();
  return headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown';
}

export async function resetPassword(currentState: { message: string }, formData: FormData) {
  // Rate limit by IP
  const ip = await getClientIP();
  const rateLimitResult = await checkPublicRateLimit(
    `reset-password:${ip}`,
    AUTH_RATE_LIMITS.resetPassword.maxRequests,
    AUTH_RATE_LIMITS.resetPassword.windowMs
  );
  if (!rateLimitResult.success) {
    return { message: 'Too many attempts. Please try again later.' };
  }

  const supabase = await createClient();
  const passwordData = {
    password: formData.get('password') as string,
    confirm_password: formData.get('confirm_password') as string,
    code: formData.get('code') as string,
  };
  if (passwordData.password !== passwordData.confirm_password) {
    return { message: 'Passwords do not match' };
  }

  const { data } = await supabase.auth.exchangeCodeForSession(passwordData.code);

  const { error } = await supabase.auth.updateUser({
    password: passwordData.password,
  });
  if (error) {
    log.error({ err: error }, 'Password reset failed');
    return { message: 'Failed to reset password. Please try again or contact support.' };
  }
  redirect(`/forgot-password/reset/success`);
}

export async function forgotPassword(currentState: { message: string }, formData: FormData) {
  const email = formData.get('email') as string;

  // Rate limit by IP + email to prevent enumeration and email bombing
  const ip = await getClientIP();
  const rateLimitResult = await checkPublicRateLimit(
    `forgot-password:${ip}:${email.toLowerCase()}`,
    AUTH_RATE_LIMITS.forgotPassword.maxRequests,
    AUTH_RATE_LIMITS.forgotPassword.windowMs
  );
  if (!rateLimitResult.success) {
    return { message: 'Too many attempts. Please try again later.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${PUBLIC_URL}/forgot-password/reset`,
  });

  // Always return success to prevent email enumeration (security best practice)
  if (error) {
    log.error({ err: error, email }, 'Forgot password request failed');
  }
  redirect(`/forgot-password/success`);
}

export async function signup(currentState: { message: string }, formData: FormData) {
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    name: formData.get('name') as string,
  };

  // Validate input first (quick sync checks) - async-defer-await pattern
  if (!data.email || !data.password || !data.name) {
    return { message: 'Email, password, and name are required.' };
  }

  // Basic email format validation before any async operations
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return { message: 'Please enter a valid email address.' };
  }

  // Password length check before any async operations
  if (data.password.length < 6) {
    return { message: 'Password must be at least 6 characters.' };
  }

  // Rate limit by IP to prevent abuse
  const ip = await getClientIP();
  const rateLimitResult = await checkPublicRateLimit(
    `signup:${ip}`,
    AUTH_RATE_LIMITS.signup.maxRequests,
    AUTH_RATE_LIMITS.signup.windowMs
  );
  if (!rateLimitResult.success) {
    return { message: 'Too many signup attempts. Please try again later.' };
  }

  const supabase = await createClient();

  // Check if user exists in our database first
  const existingDBUser = await db.select().from(usersTable).where(eq(usersTable.email, data.email));

  if (existingDBUser.length > 0) {
    return { message: 'An account with this email already exists. Please login instead.' };
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${PUBLIC_URL}/auth/callback`,
      data: {
        email_confirm: process.env.NODE_ENV !== 'production',
        full_name: data.name,
      },
    },
  });

  if (signUpError) {
    if (signUpError.message.includes('already registered')) {
      return { message: 'An account with this email already exists. Please login instead.' };
    }
    log.error({ err: signUpError, email: data.email }, 'Signup failed');
    return { message: 'Failed to create account. Please try again.' };
  }

  if (!signUpData?.user) {
    return { message: 'Failed to create user' };
  }

  try {
    // Create Stripe customer and user record in parallel (independent operations)
    const [stripeCustomerId] = await Promise.all([
      createStripeCustomer(
        signUpData.user.id,
        signUpData.user.email!,
        data.name
      ),
      db.insert(usersTable).values({
        id: signUpData.user.id,
        name: data.name,
        email: signUpData.user.email!,
      }),
    ]);

    // Create default organization for the new user with Stripe customer ID (depends on stripeCustomerId)
    await createDefaultOrganization(signUpData.user.id, data.name, signUpData.user.email!, stripeCustomerId);

    // Capture email for the async callback (TypeScript can't track null-check across closure boundary)
    const userEmail = signUpData.user.email!;

    // Send welcome email using after() for non-blocking operation (server-after-nonblocking)
    // This ensures the response is sent before the email is attempted
    after(async () => {
      try {
        await sendWelcomeEmail({
          to: userEmail,
          userName: data.name,
        });
      } catch (err) {
        log.error({ err }, 'Welcome email error');
      }
    });
  } catch (err) {
    log.error({ err }, 'Error in signup');
    return { message: 'Failed to setup user account' };
  }

  revalidatePath('/', 'layout');
  redirect('/subscribe');
}

export async function loginUser(currentState: { message: string }, formData: FormData) {
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  // Rate limit by IP + email to prevent brute force attacks
  const ip = await getClientIP();
  const rateLimitResult = await checkPublicRateLimit(
    `login:${ip}:${data.email.toLowerCase()}`,
    AUTH_RATE_LIMITS.login.maxRequests,
    AUTH_RATE_LIMITS.login.windowMs
  );
  if (!rateLimitResult.success) {
    return { message: 'Too many login attempts. Please try again later.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    log.warn({ email: data.email }, 'Login failed');
    // Use generic message to prevent user enumeration
    return { message: 'Invalid email or password.' };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function logout() {
  const supabase = await createClient();

  // Sign out from local session only to avoid network delays
  // The middleware will handle session validation on next request
  await supabase.auth.signOut({ scope: 'local' });

  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${PUBLIC_URL}/auth/callback`,
    },
  });

  if (error) {
    log.error({ err: error }, 'Google OAuth error');
    redirect('/login?error=oauth_failed');
  }

  if (data.url) {
    redirect(data.url);
  }

  // Fallback if no URL returned (shouldn't happen but handle gracefully)
  redirect('/login?error=oauth_failed');
}

export async function signInWithGithub() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${PUBLIC_URL}/auth/callback`,
    },
  });

  if (error) {
    log.error({ err: error }, 'GitHub OAuth error');
    redirect('/login?error=oauth_failed');
  }

  if (data.url) {
    redirect(data.url);
  }

  // Fallback if no URL returned (shouldn't happen but handle gracefully)
  redirect('/login?error=oauth_failed');
}
