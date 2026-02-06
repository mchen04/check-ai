'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { createClient } from '@/utils/supabase/server';
import { createStripeCustomer } from '@/utils/stripe/api';
import { db } from '@/utils/db/db';
import { usersTable } from '@/utils/db/schema';
import { createDefaultOrganization } from '@/lib/org/create-org';
import { sendWelcomeEmail } from '@/lib/email';
import { createLogger } from '@/lib/logger';

const log = createLogger('Auth');

const PUBLIC_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3001';

export async function resetPassword(currentState: { message: string }, formData: FormData) {
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
    return { message: error.message };
  }
  redirect(`/forgot-password/reset/success`);
}

export async function forgotPassword(currentState: { message: string }, formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${PUBLIC_URL}/forgot-password/reset`,
  });

  if (error) {
    return { message: error.message };
  }
  redirect(`/forgot-password/success`);
}

export async function signup(currentState: { message: string }, formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    name: formData.get('name') as string,
  };

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
    return { message: signUpError.message };
  }

  if (!signUpData?.user) {
    return { message: 'Failed to create user' };
  }

  try {
    // Create Stripe Customer Record using signup response data
    // Stripe customer is now associated with the organization, not the user
    const stripeCustomerId = await createStripeCustomer(
      signUpData.user.id,
      signUpData.user.email!,
      data.name
    );

    // Create user record in DB (billing is per-org, not per-user)
    await db.insert(usersTable).values({
      id: signUpData.user.id,
      name: data.name,
      email: signUpData.user.email!,
    });

    // Create default organization for the new user with Stripe customer ID
    await createDefaultOrganization(signUpData.user.id, data.name, signUpData.user.email!, stripeCustomerId);

    // Send welcome email (fire-and-forget, don't block signup)
    sendWelcomeEmail({
      to: signUpData.user.email!,
      userName: data.name,
    }).catch((err) => log.error({ err }, 'Welcome email error'));
  } catch (err) {
    log.error({ err }, 'Error in signup');
    return { message: 'Failed to setup user account' };
  }

  revalidatePath('/', 'layout');
  redirect('/subscribe');
}

export async function demoLogin(currentState: { message: string }, formData: FormData) {
  const password = formData.get('password') as string;

  if (password !== process.env.DEMO_PASSWORD) {
    return { message: 'Invalid demo password' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: process.env.DEMO_EMAIL!,
    password: process.env.DEMO_USER_PASSWORD!,
  });

  if (error) {
    log.error({ err: error }, 'Demo login failed');
    return { message: 'Demo access temporarily unavailable' };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function loginUser(currentState: { message: string }, formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { message: error.message };
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
