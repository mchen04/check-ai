import { redirect } from 'next/navigation';
import { eq, and, gte, desc, count, sql } from 'drizzle-orm';
import Link from 'next/link';
import {
  Shield,
  Key,
  Activity,
  TrendingUp,
  ArrowUpRight,
  PlayCircle,
} from 'lucide-react';
import { getUserOrgContext } from '@/lib/rbac';
import { db } from '@/utils/db/db';
import {
  verificationsTable,
  apiKeysTable,
  usageTable,
  userPreferencesTable,
  providerCredentialsTable,
} from '@/utils/db/schema';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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

  const { orgId, organization } = context;
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

      // Recent verifications (last 10, org-scoped)
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
        .limit(10),

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
  } catch {
    // Database errors are handled silently - default values shown to user
    // Error monitoring should be handled via APM/error boundary at a higher level
  }

  const usagePercentage = stats.verificationsLimit > 0
    ? (stats.monthlyVerifications / stats.verificationsLimit) * 100
    : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Monitor your verification activity and usage
        </p>
      </div>

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
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total Verifications */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Verifications</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight">{stats.totalVerifications.toLocaleString()}</div>
          <p className="mt-1 text-xs text-muted-foreground">All time</p>
        </Card>

        {/* Monthly Usage */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Monthly Usage</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-semibold tracking-tight">{stats.monthlyVerifications.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">
              / {stats.verificationsLimit === Infinity ? '∞' : stats.verificationsLimit.toLocaleString()}
            </span>
          </div>
          <Progress value={usagePercentage} className="mt-3 h-1.5" />
        </Card>

        {/* API Keys */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">API Keys</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Key className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight">{stats.activeApiKeys}</div>
          <p className="mt-1 text-xs text-muted-foreground">Active keys</p>
        </Card>

        {/* Monthly Cost */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Monthly Cost</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight">
            ${(stats.monthlyCost / 100).toFixed(2)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.monthlyTokens.toLocaleString()} tokens
          </p>
        </Card>
      </div>

      {/* Recent Verifications */}
      <Card>
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <h2 className="font-semibold">Recent Verifications</h2>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link href="/dashboard/verify" className="flex items-center gap-1.5">
              View all
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <div className="p-5">
          {recentVerifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Shield className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="mb-1 text-sm font-medium">No verifications yet</p>
              <p className="mb-5 text-sm text-muted-foreground">
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
                  <tr className="border-b border-border/50 text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-3 pr-4">Content</th>
                    <th className="pb-3 pr-4">Verdict</th>
                    <th className="pb-3 pr-4 text-right">Confidence</th>
                    <th className="pb-3 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {recentVerifications.map((v) => (
                    <tr key={v.id} className="border-b border-border/50 last:border-0 group">
                      <td className="py-3 pr-4 max-w-[300px]">
                        <Link
                          href={`/dashboard/verify/${v.id}`}
                          className="block truncate transition-colors group-hover:text-primary"
                        >
                          {truncateString(v.content, 50, true)}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <VerdictBadge verdict={v.finalVerdict} />
                      </td>
                      <td className="py-3 pr-4 text-right text-muted-foreground tabular-nums">
                        {v.confidenceScore ? `${(parseFloat(v.confidenceScore) * 100).toFixed(0)}%` : '-'}
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
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
      <Card className="overflow-hidden">
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
            <span>Quick Start Guide</span>
            <svg className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="border-t border-border/50 p-5">
            <div className="rounded-xl bg-muted/50 p-5">
              <p className="mb-3 text-sm font-medium">API Example</p>
              <pre className="overflow-x-auto rounded-lg bg-background p-4 font-mono text-xs leading-relaxed">
{`curl -X POST https://api.check.ai/v1/verify \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "The Eiffel Tower is in Paris"}'`}
              </pre>
            </div>
            <div className="mt-5 flex gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href="/docs">View Docs</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/keys">Get API Key</Link>
              </Button>
            </div>
          </div>
        </details>
      </Card>
    </div>
  );
}
