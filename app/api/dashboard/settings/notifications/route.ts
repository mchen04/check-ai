import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/utils/db/db';
import { userPreferencesTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';
import { withDashboardAuth, type DashboardRequest, parseAndValidate } from '@/lib/api';

// =============================================================================
// GET - Get user notification preferences
// =============================================================================

async function getHandler(req: DashboardRequest) {
  const { context } = req;

  const [preferences] = await db
    .select({
      emailNotifications: userPreferencesTable.emailNotifications,
      weeklyReport: userPreferencesTable.weeklyReport,
      escalationAlerts: userPreferencesTable.escalationAlerts,
    })
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, context.userId))
    .limit(1);

  // Return defaults if no preferences exist yet
  if (!preferences) {
    return NextResponse.json({
      emailNotifications: true,
      weeklyReport: false,
      escalationAlerts: true,
    });
  }

  return NextResponse.json(preferences);
}

export const GET = withDashboardAuth(getHandler, { permission: 'settings:view' });

// =============================================================================
// PATCH - Update notification preferences (upsert)
// =============================================================================

const NotificationPrefsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
  escalationAlerts: z.boolean().optional(),
});

async function patchHandler(req: DashboardRequest) {
  const { context } = req;

  const validation = await parseAndValidate(req, NotificationPrefsSchema);
  if (!validation.success) return validation.error;

  const { data: prefs } = validation;

  // Check if preferences exist
  const [existing] = await db
    .select({ id: userPreferencesTable.id })
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, context.userId))
    .limit(1);

  let dbResult;

  if (existing) {
    // Update existing preferences
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (prefs.emailNotifications !== undefined) {
      updates.emailNotifications = prefs.emailNotifications;
    }
    if (prefs.weeklyReport !== undefined) {
      updates.weeklyReport = prefs.weeklyReport;
    }
    if (prefs.escalationAlerts !== undefined) {
      updates.escalationAlerts = prefs.escalationAlerts;
    }

    [dbResult] = await db
      .update(userPreferencesTable)
      .set(updates)
      .where(eq(userPreferencesTable.userId, context.userId))
      .returning({
        emailNotifications: userPreferencesTable.emailNotifications,
        weeklyReport: userPreferencesTable.weeklyReport,
        escalationAlerts: userPreferencesTable.escalationAlerts,
      });
  } else {
    // Create new preferences
    [dbResult] = await db
      .insert(userPreferencesTable)
      .values({
        userId: context.userId,
        orgId: context.orgId,
        emailNotifications: prefs.emailNotifications ?? true,
        weeklyReport: prefs.weeklyReport ?? false,
        escalationAlerts: prefs.escalationAlerts ?? true,
      })
      .returning({
        emailNotifications: userPreferencesTable.emailNotifications,
        weeklyReport: userPreferencesTable.weeklyReport,
        escalationAlerts: userPreferencesTable.escalationAlerts,
      });
  }

  return NextResponse.json({
    success: true,
    ...dbResult,
  });
}

export const PATCH = withDashboardAuth(patchHandler, { permission: 'settings:update_notifications' });
