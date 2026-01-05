import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/utils/db/db';
import { userPreferencesTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';
import { getUserOrgContext, checkPermission } from '@/lib/rbac/get-user-org';

// =============================================================================
// GET - Get user notification preferences
// =============================================================================

export async function GET() {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(context, 'settings:view');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

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
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// PATCH - Update notification preferences (upsert)
// =============================================================================

const NotificationPrefsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
  escalationAlerts: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const context = await getUserOrgContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, reason } = checkPermission(context, 'settings:update_notifications');
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const body = await req.json();
    const parsed = NotificationPrefsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Check if preferences exist
    const [existing] = await db
      .select({ id: userPreferencesTable.id })
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.userId, context.userId))
      .limit(1);

    let result;

    if (existing) {
      // Update existing preferences
      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (parsed.data.emailNotifications !== undefined) {
        updates.emailNotifications = parsed.data.emailNotifications;
      }
      if (parsed.data.weeklyReport !== undefined) {
        updates.weeklyReport = parsed.data.weeklyReport;
      }
      if (parsed.data.escalationAlerts !== undefined) {
        updates.escalationAlerts = parsed.data.escalationAlerts;
      }

      [result] = await db
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
      [result] = await db
        .insert(userPreferencesTable)
        .values({
          userId: context.userId,
          orgId: context.orgId,
          emailNotifications: parsed.data.emailNotifications ?? true,
          weeklyReport: parsed.data.weeklyReport ?? false,
          escalationAlerts: parsed.data.escalationAlerts ?? true,
        })
        .returning({
          emailNotifications: userPreferencesTable.emailNotifications,
          weeklyReport: userPreferencesTable.weeklyReport,
          escalationAlerts: userPreferencesTable.escalationAlerts,
        });
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
