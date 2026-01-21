import { redirect } from 'next/navigation';
import { getUserOrgContext } from '@/lib/rbac';
import { db } from '@/utils/db/db';
import {
  verificationsTable,
  apiKeysTable,
  usageTable,
  userPreferencesTable,
  providerCredentialsTable,
} from '@/utils/db/schema';
import { eq, and, gte, desc, count, sql } from 'drizzle-orm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import {
  Shield,
  Key,
  Activity,
  TrendingUp,
  ArrowUpRight,
  PlayCircle,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { truncateString } from '@/lib/api/formatters';
import type { VerificationStatus } from '@/lib/api/types';
import { OnboardingChecklist } from '@/components/OnboardingChecklist';
import { VerdictBadge, type VerdictDisplay } from '@/components/ui/verdict-display';

// Get the start of the current month
function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function Dashboard() {
  // Get authenticated user's organization context
  const context = await getUserOrgContext();

  if (!context) {
    redirect('/login');
  }

  const { orgId, userEmail, organization } = context;
  const monthStart = getMonthStart();

  // Initialize with defaults
  let stats = {
    totalVerifications: 0,
    monthlyVerifications: 0,
    verificationsLimit: organization.verificationsLimit,
    activeApiKeys: 0,
    monthlyTokens: 0,
    monthlyCost: 0,
  };

  let recentVerifications: Array<{
    id: string;
    content: string;
    status: VerificationStatus;
    finalVerdict: VerdictDisplay;
    confidenceScore: string | null;
    createdAt: Date;
  }> = [];

  let onboarding = {
    completed: false,
    hasAddedProvider: false,
    hasCreatedApiKey: false,
    hasVisitedPlayground: false,
    hasRunVerification: false,
  };

  try {
    // Execute all queries in parallel for better performance
    const [
      totalResult,
      monthlyResult,
      keysResult,
      usageResult,
      recentResult,
      preferencesResult,
      providersResult,
    ] = await Promise.all([
      // Total verifications (all time)
      db
        .select({ count: count() })
        .from(verificationsTable)
        .where(eq(verificationsTable.orgId, orgId)),

      // Monthly verifications
      db
        .select({ count: count() })
        .from(verificationsTable)
        .where(
          and(
            eq(verificationsTable.orgId, orgId),
            gte(verificationsTable.createdAt, monthStart)
          )
        ),

      // Active API keys
      db
        .select({ count: count() })
        .from(apiKeysTable)
        .where(
          and(
            eq(apiKeysTable.orgId, orgId),
            eq(apiKeysTable.isActive, true)
          )
        ),

      // Monthly tokens + cost
      db
        .select({
          tokens: sql<number>`COALESCE(SUM(${usageTable.inputTokens} + ${usageTable.outputTokens}), 0)`,
          cost: sql<number>`COALESCE(SUM(${usageTable.costCents}), 0)`,
        })
        .from(usageTable)
        .where(
          and(
            eq(usageTable.orgId, orgId),
            gte(usageTable.createdAt, monthStart)
          )
        ),

      // Recent verifications (last 5, org-scoped)
      db
        .select({
          id: verificationsTable.id,
          content: verificationsTable.content,
          status: verificationsTable.status,
          finalVerdict: verificationsTable.finalVerdict,
          confidenceScore: verificationsTable.confidenceScore,
          createdAt: verificationsTable.createdAt,
        })
        .from(verificationsTable)
        .where(eq(verificationsTable.orgId, orgId))
        .orderBy(desc(verificationsTable.createdAt))
        .limit(5),

      // User preferences (onboarding state)
      db
        .select({
          onboardingCompleted: userPreferencesTable.onboardingCompleted,
          hasCreatedApiKey: userPreferencesTable.hasCreatedApiKey,
          hasVisitedPlayground: userPreferencesTable.hasVisitedPlayground,
          hasRunVerification: userPreferencesTable.hasRunVerification,
        })
        .from(userPreferencesTable)
        .where(eq(userPreferencesTable.userId, context.userId))
        .limit(1),

      // Provider credentials count
      db
        .select({ count: count() })
        .from(providerCredentialsTable)
        .where(eq(providerCredentialsTable.orgId, orgId)),
    ]);

    stats = {
      totalVerifications: Number(totalResult[0]?.count ?? 0),
      monthlyVerifications: Number(monthlyResult[0]?.count ?? 0),
      verificationsLimit: organization.verificationsLimit,
      activeApiKeys: Number(keysResult[0]?.count ?? 0),
      monthlyTokens: Number(usageResult[0]?.tokens ?? 0),
      monthlyCost: Number(usageResult[0]?.cost ?? 0),
    };

    recentVerifications = recentResult.map((v) => ({
      ...v,
      finalVerdict: v.finalVerdict as VerdictDisplay,
    }));

    // Derive completion status from actual data rather than flags
    const hasAddedProvider = Number(providersResult[0]?.count ?? 0) > 0;
    const hasCreatedApiKey = stats.activeApiKeys > 0;
    const hasRunVerification = stats.totalVerifications > 0;

    onboarding = {
      completed: preferencesResult[0]?.onboardingCompleted ?? false,
      hasAddedProvider,
      hasCreatedApiKey,
      hasVisitedPlayground: preferencesResult[0]?.hasVisitedPlayground ?? false,
      hasRunVerification,
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
  }

  const usagePercentage = stats.verificationsLimit > 0
    ? (stats.monthlyVerifications / stats.verificationsLimit) * 100
    : 0;

  return (
    <div className="p-6">
      {/* Onboarding Checklist */}
      {!onboarding.completed && (
        <OnboardingChecklist
          hasAddedProvider={onboarding.hasAddedProvider}
          hasCreatedApiKey={onboarding.hasCreatedApiKey}
          hasVisitedPlayground={onboarding.hasVisitedPlayground}
          hasRunVerification={onboarding.hasRunVerification}
        />
      )}

      {/* Stats Grid */}
      <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total Verifications */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Verifications</span>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-semibold">{stats.totalVerifications}</div>
          <p className="text-xs text-muted-foreground">All time</p>
        </Card>

        {/* Monthly Usage */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Monthly Usage</span>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {stats.monthlyVerifications}
            <span className="text-sm font-normal text-muted-foreground">
              {' '}/ {stats.verificationsLimit === Infinity ? '∞' : stats.verificationsLimit}
            </span>
          </div>
          <Progress value={usagePercentage} className="mt-2 h-1.5" />
        </Card>

        {/* API Keys */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">API Keys</span>
            <Key className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-semibold">{stats.activeApiKeys}</div>
          <p className="text-xs text-muted-foreground">Active keys</p>
        </Card>

        {/* Monthly Cost */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Monthly Cost</span>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-semibold">
            ${(stats.monthlyCost / 100).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.monthlyTokens.toLocaleString()} tokens
          </p>
        </Card>
      </div>

      {/* Recent Verifications */}
      <Card className="mb-6">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Recent Verifications</h3>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/verify" className="flex items-center gap-1.5">
              View All
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <div className="p-4">
          {recentVerifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Shield className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="mb-1 text-sm font-medium">No verifications yet</p>
              <p className="mb-4 text-xs text-muted-foreground">
                Run your first verification in the playground
              </p>
              <Button size="sm" asChild>
                <Link href="/dashboard/playground">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Try Playground
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-2 pr-4">Content</th>
                    <th className="pb-2 pr-4">Verdict</th>
                    <th className="pb-2 pr-4 text-right">Confidence</th>
                    <th className="pb-2 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {recentVerifications.map((v) => (
                    <tr key={v.id} className="border-b last:border-0 group">
                      <td className="py-2.5 pr-4 max-w-[300px]">
                        <Link
                          href={`/dashboard/verify/${v.id}`}
                          className="block truncate group-hover:text-primary"
                        >
                          {truncateString(v.content, 50, true)}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4">
                        <VerdictBadge verdict={v.finalVerdict} />
                      </td>
                      <td className="py-2.5 pr-4 text-right text-muted-foreground">
                        {v.confidenceScore ? `${(parseFloat(v.confidenceScore) * 100).toFixed(0)}%` : '-'}
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground">
                        {formatRelativeTime(v.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Getting Started */}
      <details className="group">
        <summary className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
          <span>Getting Started</span>
          <svg className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <Card className="mt-3">
          <div className="p-4">
            <div className="rounded-md bg-muted p-4">
              <p className="mb-2 text-sm font-medium">Quick API Example</p>
              <pre className="overflow-x-auto rounded bg-background p-3 font-mono text-xs leading-relaxed">
{`curl -X POST https://api.check.ai/v1/verify \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "The Eiffel Tower is in Paris"}'`}
              </pre>
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href="/docs">View Docs</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/keys">Get API Key</Link>
              </Button>
            </div>
          </div>
        </Card>
      </details>
    </div>
  );
}
