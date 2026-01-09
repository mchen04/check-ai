import { redirect } from 'next/navigation';
import { getUserOrgContext } from '@/lib/rbac/get-user-org';
import { db } from '@/utils/db/db';
import {
  verificationsTable,
  apiKeysTable,
  usageTable,
  userPreferencesTable,
} from '@/utils/db/schema';
import { eq, and, gte, desc, count, sql } from 'drizzle-orm';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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

    if (preferencesResult[0]) {
      onboarding = {
        completed: preferencesResult[0].onboardingCompleted,
        hasCreatedApiKey: preferencesResult[0].hasCreatedApiKey,
        hasVisitedPlayground: preferencesResult[0].hasVisitedPlayground,
        hasRunVerification: preferencesResult[0].hasRunVerification,
      };
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
  }

  const usagePercentage = stats.verificationsLimit > 0
    ? (stats.monthlyVerifications / stats.verificationsLimit) * 100
    : 0;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground">{userEmail}</p>
      </div>

      {/* Onboarding Checklist */}
      {!onboarding.completed && (
        <OnboardingChecklist
          hasCreatedApiKey={onboarding.hasCreatedApiKey}
          hasVisitedPlayground={onboarding.hasVisitedPlayground}
          hasRunVerification={onboarding.hasRunVerification}
        />
      )}

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Verifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Verifications
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVerifications}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        {/* Monthly Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Usage
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="mb-2 text-2xl font-bold">
              {stats.monthlyVerifications} / {stats.verificationsLimit === Infinity ? '∞' : stats.verificationsLimit}
            </div>
            <Progress value={usagePercentage} className="h-1.5" />
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              API Keys
            </CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeApiKeys}</div>
            <p className="text-xs text-muted-foreground">Active keys</p>
          </CardContent>
        </Card>

        {/* Monthly Cost */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Cost
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats.monthlyCost / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.monthlyTokens.toLocaleString()} tokens
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Verifications */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Verifications</CardTitle>
                <CardDescription className="mt-1">
                  Your latest verification requests
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/verify" className="flex items-center gap-1">
                  View All
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentVerifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Shield className="mb-4 h-12 w-12 text-muted-foreground/30" />
                <p className="mb-2 text-sm font-medium">No verifications yet</p>
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
              <div className="space-y-4">
                {recentVerifications.map((v) => (
                  <Link
                    key={v.id}
                    href={`/dashboard/verify/${v.id}`}
                    className="flex items-center gap-4 rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/50"
                  >
                    {getVerdictIcon(v.finalVerdict)}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {v.content.length > 60
                          ? v.content.slice(0, 60) + '...'
                          : v.content}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(v.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getVerdictBadge(v.finalVerdict)}
                      {v.confidenceScore && (
                        <span className="text-xs text-muted-foreground">
                          {(parseFloat(v.confidenceScore) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription className="mt-1">Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/dashboard/playground">
                <PlayCircle className="mr-2 h-4 w-4" />
                Open Playground
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/dashboard/keys">
                <Key className="mr-2 h-4 w-4" />
                Manage API Keys
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/dashboard/usage">
                <Activity className="mr-2 h-4 w-4" />
                View Usage
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/dashboard/verify">
                <Shield className="mr-2 h-4 w-4" />
                Verification History
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started / Documentation */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription className="mt-1">
              Integrate Shove into your application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted p-4">
              <p className="mb-3 text-sm font-medium">Quick API Example</p>
              <pre className="overflow-x-auto rounded bg-background p-3 font-mono text-xs">
{`curl -X POST https://api.shove.ai/v1/verify \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "The Eiffel Tower is in Paris",
    "methods": { "reasoning": 1.0, "tool": 0.5 }
  }'`}
              </pre>
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href="/docs">View Documentation</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/keys">Get API Key</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
