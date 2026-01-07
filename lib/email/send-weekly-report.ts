import { resend } from './resend';
import { WeeklyReportEmail } from './templates/weekly-report';
import { db } from '@/utils/db/db';
import {
  userPreferencesTable,
  orgMembersTable,
  usersTable,
  verificationsTable,
  escalationsTable,
  paradigmResultsTable,
  organizationsTable,
} from '@/utils/db/schema';
import { eq, and, gte, lte, sql, count } from 'drizzle-orm';

interface WeeklyReportStats {
  totalVerifications: number;
  successRate: number;
  avgConfidence: number;
  escalationsCreated: number;
  escalationsResolved: number;
  topParadigm: string | null;
  totalCostCents: number;
}

interface SendWeeklyReportParams {
  orgId: string;
  organizationName: string;
  periodStart: Date;
  periodEnd: Date;
  dashboardUrl: string;
}

/**
 * Calculates weekly stats for an organization
 */
async function calculateWeeklyStats(
  orgId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<WeeklyReportStats> {
  // Get verification stats
  const [verificationStats] = await db
    .select({
      total: count(),
      successCount: sql<number>`count(case when ${verificationsTable.finalVerdict} = 'true' then 1 end)`,
      avgConfidence: sql<number>`avg(${verificationsTable.confidenceScore}::numeric)`,
      totalCost: sql<number>`coalesce(sum(${verificationsTable.costCents}), 0)`,
    })
    .from(verificationsTable)
    .where(
      and(
        eq(verificationsTable.orgId, orgId),
        gte(verificationsTable.createdAt, periodStart),
        lte(verificationsTable.createdAt, periodEnd)
      )
    );

  // Get escalation stats
  const [escalationStats] = await db
    .select({
      created: count(),
      resolved: sql<number>`count(case when ${escalationsTable.resolvedAt} is not null then 1 end)`,
    })
    .from(escalationsTable)
    .innerJoin(verificationsTable, eq(escalationsTable.verificationId, verificationsTable.id))
    .where(
      and(
        eq(verificationsTable.orgId, orgId),
        gte(escalationsTable.createdAt, periodStart),
        lte(escalationsTable.createdAt, periodEnd)
      )
    );

  // Get top paradigm by usage
  const topParadigmResult = await db
    .select({
      paradigm: paradigmResultsTable.paradigmType,
      usageCount: count(),
    })
    .from(paradigmResultsTable)
    .innerJoin(verificationsTable, eq(paradigmResultsTable.verificationId, verificationsTable.id))
    .where(
      and(
        eq(verificationsTable.orgId, orgId),
        gte(verificationsTable.createdAt, periodStart),
        lte(verificationsTable.createdAt, periodEnd)
      )
    )
    .groupBy(paradigmResultsTable.paradigmType)
    .orderBy(sql`count(*) desc`)
    .limit(1);

  const totalVerifications = Number(verificationStats?.total || 0);
  const successCount = Number(verificationStats?.successCount || 0);

  return {
    totalVerifications,
    successRate: totalVerifications > 0 ? successCount / totalVerifications : 0,
    avgConfidence: Number(verificationStats?.avgConfidence || 0),
    escalationsCreated: Number(escalationStats?.created || 0),
    escalationsResolved: Number(escalationStats?.resolved || 0),
    topParadigm: topParadigmResult[0]?.paradigm || null,
    totalCostCents: Number(verificationStats?.totalCost || 0),
  };
}

/**
 * Generates highlights based on weekly stats
 */
function generateHighlights(stats: WeeklyReportStats): string[] {
  const highlights: string[] = [];

  if (stats.totalVerifications > 100) {
    highlights.push(`High volume week with ${stats.totalVerifications.toLocaleString()} verifications`);
  }

  if (stats.successRate >= 0.95) {
    highlights.push('Excellent accuracy - 95%+ success rate');
  } else if (stats.successRate >= 0.9) {
    highlights.push('Strong accuracy - 90%+ success rate');
  }

  if (stats.avgConfidence >= 0.85) {
    highlights.push('High confidence scores across verifications');
  }

  if (stats.escalationsResolved > 0 && stats.escalationsCreated > 0) {
    const resolutionRate = stats.escalationsResolved / stats.escalationsCreated;
    if (resolutionRate >= 0.8) {
      highlights.push('Great escalation response - most escalations resolved');
    }
  }

  if (stats.escalationsCreated === 0 && stats.totalVerifications > 0) {
    highlights.push('Zero escalations - all verifications auto-resolved');
  }

  return highlights.slice(0, 3); // Max 3 highlights
}

/**
 * Sends weekly reports to all users in an organization who have them enabled
 */
export async function sendWeeklyReportForOrg({
  orgId,
  organizationName,
  periodStart,
  periodEnd,
  dashboardUrl,
}: SendWeeklyReportParams): Promise<{ success: boolean; sent: number; errors: string[] }> {
  if (!resend) {
    console.warn('Resend not configured, skipping weekly reports');
    return { success: true, sent: 0, errors: [] };
  }

  const errors: string[] = [];
  let sent = 0;

  try {
    // Calculate stats for this org
    const stats = await calculateWeeklyStats(orgId, periodStart, periodEnd);

    // Skip if no activity
    if (stats.totalVerifications === 0) {
      return { success: true, sent: 0, errors: [] };
    }

    const highlights = generateHighlights(stats);

    // Get all org members with their user info and preferences
    const members = await db
      .select({
        userId: orgMembersTable.userId,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(orgMembersTable)
      .innerJoin(usersTable, eq(usersTable.id, orgMembersTable.userId))
      .where(eq(orgMembersTable.orgId, orgId));

    for (const member of members) {
      // Check if user has weekly reports enabled
      const [prefs] = await db
        .select({ weeklyReport: userPreferencesTable.weeklyReport })
        .from(userPreferencesTable)
        .where(eq(userPreferencesTable.userId, member.userId));

      // Default to true if no preferences set
      const reportEnabled = prefs?.weeklyReport ?? true;

      if (!reportEnabled) {
        continue;
      }

      try {
        const { error } = await resend.emails.send({
          from: 'VerifyAI <reports@verifyai.dev>',
          to: member.userEmail,
          subject: `Weekly Report - ${organizationName}`,
          react: WeeklyReportEmail({
            userName: member.userName || 'there',
            organizationName,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            stats,
            highlights,
            dashboardUrl,
          }),
        });

        if (error) {
          errors.push(`Failed to send to ${member.userEmail}: ${error.message}`);
        } else {
          sent++;
        }
      } catch (err) {
        errors.push(
          `Error sending to ${member.userEmail}: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    }

    return { success: errors.length === 0, sent, errors };
  } catch (err) {
    console.error('Error sending weekly reports:', err);
    return { success: false, sent: 0, errors: ['Failed to process weekly reports'] };
  }
}

/**
 * Sends weekly reports to all active organizations
 * This is called by the cron job
 */
export async function sendAllWeeklyReports(): Promise<{
  orgsProcessed: number;
  totalSent: number;
  errors: string[];
}> {
  const dashboardUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://app.verifyai.dev';

  // Calculate period (last 7 days)
  const periodEnd = new Date();
  periodEnd.setHours(0, 0, 0, 0);
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - 7);

  // Get all organizations with at least one verification in the period
  const activeOrgs = await db
    .selectDistinct({
      orgId: verificationsTable.orgId,
    })
    .from(verificationsTable)
    .where(
      and(
        gte(verificationsTable.createdAt, periodStart),
        lte(verificationsTable.createdAt, periodEnd)
      )
    );

  let totalSent = 0;
  const allErrors: string[] = [];

  for (const { orgId } of activeOrgs) {
    // Get org name
    const [org] = await db
      .select({ name: organizationsTable.name })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, orgId));

    if (!org) continue;

    const result = await sendWeeklyReportForOrg({
      orgId,
      organizationName: org.name,
      periodStart,
      periodEnd,
      dashboardUrl,
    });

    totalSent += result.sent;
    allErrors.push(...result.errors);
  }

  return {
    orgsProcessed: activeOrgs.length,
    totalSent,
    errors: allErrors,
  };
}
