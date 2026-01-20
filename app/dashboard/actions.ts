'use server';

import { db } from '@/utils/db/db';
import { userPreferencesTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';
import { getUserOrgContext } from '@/lib/rbac';
import { revalidatePath } from 'next/cache';

export async function dismissOnboarding() {
  const context = await getUserOrgContext();
  if (!context) {
    throw new Error('Not authenticated');
  }

  await db
    .update(userPreferencesTable)
    .set({
      onboardingCompleted: true,
      updatedAt: new Date(),
    })
    .where(eq(userPreferencesTable.userId, context.userId));

  revalidatePath('/dashboard');
}

export async function markOnboardingStep(
  step: 'hasCreatedApiKey' | 'hasVisitedPlayground' | 'hasRunVerification'
) {
  const context = await getUserOrgContext();
  if (!context) {
    return;
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
}
