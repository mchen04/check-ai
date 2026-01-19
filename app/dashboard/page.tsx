import { redirect } from 'next/navigation';
import { getUserOrgContext } from '@/lib/rbac/get-user-org';
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
  CheckCircle2,
  XCircle,
  AlertCircle,
  PlayCircle,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { OnboardingChecklist } from '@/components/OnboardingChecklist';

// Get the start of the current month
function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Helper to get verdict icon
function getVerdictIcon(verdict: string | null) {
  switch (verdict) {
    case 'true':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'false':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'uncertain':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function getVerdictBadge(verdict: string | null) {
  switch (verdict) {
    case 'true':
      return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
    case 'false':
      return <Badge className="bg-red-100 text-red-800">False</Badge>;
    case 'uncertain':
      return <Badge className="bg-yellow-100 text-yellow-800">Uncertain</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
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
    status: string;
    finalVerdict: string | null;
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

    recentVerifications = recentResult;

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
    <div className="p-4">
      {/* Onboarding Checklist */}
      {!onboarding.completed && (
        <OnboardingChecklist
          hasAddedProvider={onboarding.hasAddedProvider}
          hasCreatedApiKey={onboarding.hasCreatedApiKey}
          hasVisitedPlayground={onboarding.hasVisitedPlayground}
          hasRunVerification={onboarding.hasRunVerification}
        />
      )}

      {/* Stats Grid - Compact */}
      <div className="mb-4 grid gap-3 grid-cols-2 lg:grid-cols-4">
        {/* Total Verifications */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Total Verifications</span>
            <Shield className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="mt-1 text-lg font-semibold">{stats.totalVerifications}</div>
          <p className="text-[10px] text-muted-foreground">All time</p>
        </Card>

        {/* Monthly Usage */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Monthly Usage</span>
            <Activity className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="mt-1 text-lg font-semibold">
            {stats.monthlyVerifications} / {stats.verificationsLimit === Infinity ? '∞' : stats.verificationsLimit}
          </div>
          <Progress value={usagePercentage} className="mt-1 h-1" />
        </Card>

        {/* API Keys */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">API Keys</span>
            <Key className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="mt-1 text-lg font-semibold">{stats.activeApiKeys}</div>
          <p className="text-[10px] text-muted-foreground">Active keys</p>
        </Card>

        {/* Monthly Cost */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Monthly Cost</span>
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="mt-1 text-lg font-semibold">
            ${(stats.monthlyCost / 100).toFixed(2)}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {stats.monthlyTokens.toLocaleString()} tokens
          </p>
        </Card>
      </div>

      {/* Recent Verifications - Full Width */}
      <Card className="mb-4">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <h3 className="text-sm font-semibold">Recent Verifications</h3>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
            <Link href="/dashboard/verify" className="flex items-center gap-1">
              View All
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
        <div className="p-2">
          {recentVerifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Shield className="mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="mb-1 text-xs font-medium">No verifications yet</p>
              <p className="mb-3 text-[10px] text-muted-foreground">
                Run your first verification in the playground
              </p>
              <Button size="sm" className="h-7 text-xs" asChild>
                <Link href="/dashboard/playground">
                  <PlayCircle className="mr-1.5 h-3 w-3" />
                  Try Playground
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {recentVerifications.map((v) => (
                <Link
                  key={v.id}
                  href={`/dashboard/verify/${v.id}`}
                  className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
                >
                  {getVerdictIcon(v.finalVerdict)}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {v.content.length > 80
                        ? v.content.slice(0, 80) + '...'
                        : v.content}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(v.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getVerdictBadge(v.finalVerdict)}
                    {v.confidenceScore && (
                      <span className="text-[10px] text-muted-foreground">
                        {(parseFloat(v.confidenceScore) * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Getting Started - Collapsible */}
      <details className="group">
        <summary className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
          <span>Getting Started</span>
          <svg className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <Card className="mt-2">
          <div className="p-3">
            <div className="rounded-md bg-muted p-3">
              <p className="mb-2 text-xs font-medium">Quick API Example</p>
              <pre className="overflow-x-auto rounded bg-background p-2 font-mono text-[10px] leading-relaxed">
{`curl -X POST https://api.check.ai/v1/verify \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "The Eiffel Tower is in Paris"}'`}
              </pre>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                <Link href="/docs">View Docs</Link>
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                <Link href="/dashboard/keys">Get API Key</Link>
              </Button>
            </div>
          </div>
        </Card>
      </details>
    </div>
  );
}
