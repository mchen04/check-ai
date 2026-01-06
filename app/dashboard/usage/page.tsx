import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getUserOrgContext } from '@/lib/rbac/get-user-org';
import { db } from '@/utils/db/db';
import { usageTable, verificationsTable } from '@/utils/db/schema';
import { eq, and, desc, gte, sql, count } from 'drizzle-orm';
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
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  Activity,
  TrendingUp,
  Zap,
  CreditCard,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { formatDistanceToNow, format, startOfMonth, endOfMonth } from 'date-fns';
import { AnalyticsSection } from './analytics-section';

// Get the start of the current month
function getMonthStart() {
  return startOfMonth(new Date());
}

function getMonthEnd() {
  return endOfMonth(new Date());
}

// Capitalize first letter helper
function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default async function UsagePage() {
  // Get authenticated user's organization context
  const context = await getUserOrgContext();

  if (!context) {
    redirect('/login');
  }

  const { orgId, organization } = context;
  const monthStart = getMonthStart();
  const monthEnd = getMonthEnd();

  // Initialize stats with org data
  let stats = {
    totalVerifications: 0,
    monthlyVerifications: 0,
    verificationsLimit: organization.verificationsLimit,
    totalTokens: 0,
    totalCost: 0,
    monthlyTokens: 0,
    monthlyCost: 0,
  };

  // Try to get real usage data
  let usageByProvider: Array<{
    provider: string;
    totalTokens: number;
    totalCost: number;
    count: number;
  }> = [];

  let usageByModel: Array<{
    model: string;
    provider: string;
    totalTokens: number;
    totalCost: number;
    count: number;
  }> = [];

  let recentUsage: Array<{
    id: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costCents: number;
    createdAt: Date;
  }> = [];

  try {
    // Execute queries in parallel
    const [
      monthlyVerificationsResult,
      providerUsage,
      modelUsage,
      recent,
    ] = await Promise.all([
      // Monthly verifications count
      db
        .select({ count: count() })
        .from(verificationsTable)
        .where(
          and(
            eq(verificationsTable.orgId, orgId),
            gte(verificationsTable.createdAt, monthStart)
          )
        ),

      // Get usage by provider (org-scoped)
      db
        .select({
          provider: usageTable.provider,
          totalInputTokens: sql<number>`COALESCE(SUM(${usageTable.inputTokens}), 0)`,
          totalOutputTokens: sql<number>`COALESCE(SUM(${usageTable.outputTokens}), 0)`,
          totalCost: sql<number>`COALESCE(SUM(${usageTable.costCents}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(usageTable)
        .where(
          and(
            eq(usageTable.orgId, orgId),
            gte(usageTable.createdAt, monthStart)
          )
        )
        .groupBy(usageTable.provider),

      // Get usage by model (org-scoped)
      db
        .select({
          model: usageTable.model,
          provider: usageTable.provider,
          totalInputTokens: sql<number>`COALESCE(SUM(${usageTable.inputTokens}), 0)`,
          totalOutputTokens: sql<number>`COALESCE(SUM(${usageTable.outputTokens}), 0)`,
          totalCost: sql<number>`COALESCE(SUM(${usageTable.costCents}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(usageTable)
        .where(
          and(
            eq(usageTable.orgId, orgId),
            gte(usageTable.createdAt, monthStart)
          )
        )
        .groupBy(usageTable.model, usageTable.provider),

      // Get recent usage (org-scoped)
      db
        .select({
          id: usageTable.id,
          provider: usageTable.provider,
          model: usageTable.model,
          inputTokens: usageTable.inputTokens,
          outputTokens: usageTable.outputTokens,
          costCents: usageTable.costCents,
          createdAt: usageTable.createdAt,
        })
        .from(usageTable)
        .where(eq(usageTable.orgId, orgId))
        .orderBy(desc(usageTable.createdAt))
        .limit(10),
    ]);

    stats.monthlyVerifications = Number(monthlyVerificationsResult[0]?.count ?? 0);

    usageByProvider = providerUsage.map((p) => ({
      provider: p.provider,
      totalTokens: Number(p.totalInputTokens) + Number(p.totalOutputTokens),
      totalCost: Number(p.totalCost),
      count: Number(p.count),
    }));

    usageByModel = modelUsage.map((m) => ({
      model: m.model,
      provider: m.provider,
      totalTokens: Number(m.totalInputTokens) + Number(m.totalOutputTokens),
      totalCost: Number(m.totalCost),
      count: Number(m.count),
    }));

    recentUsage = recent;

    // Calculate totals from provider usage
    stats.monthlyTokens = usageByProvider.reduce((sum, p) => sum + p.totalTokens, 0);
    stats.monthlyCost = usageByProvider.reduce((sum, p) => sum + p.totalCost, 0);
  } catch (e) {
    console.error('Error fetching usage:', e);
  }

  const usagePercentage =
    stats.verificationsLimit > 0
      ? (stats.monthlyVerifications / stats.verificationsLimit) * 100
      : 0;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Usage & Billing</h1>
        <p className="text-muted-foreground">
          Monitor your API usage and manage your subscription
        </p>
      </div>

      {/* Billing Period */}
      <Card className="mb-6">
        <CardContent className="flex items-center justify-between pt-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Current Billing Period</p>
              <p className="text-sm text-muted-foreground">
                {format(monthStart, 'MMMM d, yyyy')} - {format(monthEnd, 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href="/subscribe">
              <CreditCard className="mr-2 h-4 w-4" />
              Manage Subscription
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Monthly Verifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Verifications
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="mb-2 text-2xl font-bold">
              {stats.monthlyVerifications}
              <span className="text-sm font-normal text-muted-foreground">
                {' '}
                / {stats.verificationsLimit === Infinity ? '∞' : stats.verificationsLimit}
              </span>
            </div>
            <Progress value={usagePercentage} className="h-1.5" />
            <p className="mt-2 text-xs text-muted-foreground">
              {(100 - usagePercentage).toFixed(0)}% remaining
            </p>
          </CardContent>
        </Card>

        {/* Tokens Used */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tokens Used
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.monthlyTokens.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        {/* API Cost */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              API Cost
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats.monthlyCost / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">LLM API usage</p>
          </CardContent>
        </Card>

        {/* Plan */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Plan
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{capitalize(organization.planType)}</span>
              <Badge variant="outline">Active</Badge>
            </div>
            {organization.planType === 'free' && (
              <p className="text-xs text-muted-foreground">
                <Link href="/subscribe" className="text-primary hover:underline">
                  Upgrade to Pro
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Usage by Provider */}
        <Card>
          <CardHeader>
            <CardTitle>Usage by Provider</CardTitle>
            <CardDescription>Token usage across LLM providers</CardDescription>
          </CardHeader>
          <CardContent>
            {usageByProvider.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No usage data yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {usageByProvider.map((p) => (
                  <div key={p.provider} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{p.provider}</span>
                      <span className="text-sm text-muted-foreground">
                        {p.totalTokens.toLocaleString()} tokens
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{p.count} requests</span>
                      <span>${(p.totalCost / 100).toFixed(4)}</span>
                    </div>
                    <Progress
                      value={
                        stats.monthlyTokens > 0
                          ? (p.totalTokens / stats.monthlyTokens) * 100
                          : 0
                      }
                      className="h-1.5"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage by Model */}
        <Card>
          <CardHeader>
            <CardTitle>Usage by Model</CardTitle>
            <CardDescription>Token usage by specific models</CardDescription>
          </CardHeader>
          <CardContent>
            {usageByModel.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No usage data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {usageByModel.slice(0, 5).map((m) => (
                  <div
                    key={`${m.provider}-${m.model}`}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.model}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {m.provider}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {m.totalTokens.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ${(m.totalCost / 100).toFixed(4)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Section */}
      <Suspense
        fallback={
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-7 w-24" />
                <Skeleton className="mt-1 h-4 w-48" />
              </div>
              <Skeleton className="h-10 w-[140px]" />
            </div>
            <Skeleton className="h-[400px] w-full" />
          </div>
        }
      >
        <AnalyticsSection />
      </Suspense>

      {/* Recent Usage */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent API Calls</CardTitle>
          <CardDescription>Your most recent verification requests</CardDescription>
        </CardHeader>
        <CardContent>
          {recentUsage.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-3">Provider</th>
                    <th className="pb-3">Model</th>
                    <th className="pb-3 text-right">Input</th>
                    <th className="pb-3 text-right">Output</th>
                    <th className="pb-3 text-right">Cost</th>
                    <th className="pb-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {recentUsage.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-3 capitalize">{u.provider}</td>
                      <td className="py-3 font-mono text-xs">{u.model}</td>
                      <td className="py-3 text-right">
                        {u.inputTokens.toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        {u.outputTokens.toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        ${(u.costCents / 100).toFixed(4)}
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {formatDistanceToNow(new Date(u.createdAt), {
                          addSuffix: true,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
