'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/utils/db/db';
import { userPreferencesTable } from '@/utils/db/schema';
import { getUserOrgContext } from '@/lib/rbac';

export async function dismissOnboarding(): Promise<{ success: boolean; error?: string }> {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return { success: false, error: 'Not authenticated' };
    }

    await db
      .update(userPreferencesTable)
      .set({
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(userPreferencesTable.userId, context.userId));

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to dismiss onboarding:', error);
    return { success: false, error: 'Failed to dismiss onboarding' };
  }
}

export async function markOnboardingStep(
  step: 'hasCreatedApiKey' | 'hasVisitedPlayground' | 'hasRunVerification'
): Promise<{ success: boolean; error?: string }> {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return { success: false, error: 'Not authenticated' };
    }

    // Upsert: create record if not exists, update if exists
    await db
      .insert(userPreferencesTable)
      .values({
        userId: context.userId,
        orgId: context.orgId,
        [step]: true,
      })
      .onConflictDoUpdate({
        target: userPreferencesTable.userId,
        set: {
          [step]: true,
          updatedAt: new Date(),
        },
      });

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to mark onboarding step:', error);
    return { success: false, error: 'Failed to update onboarding progress' };
  }
}
