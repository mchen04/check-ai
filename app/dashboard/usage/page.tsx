import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getUserOrgContext } from '@/lib/rbac';
import { db } from '@/utils/db/db';
import { usageTable, verificationsTable } from '@/utils/db/schema';
import { eq, and, desc, gte, sql, count } from 'drizzle-orm';
import { Card } from '@/components/ui/card';
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
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { formatRelativeTime } from '@/lib/utils';
import { AnalyticsSection } from './analytics-section';
import { AdvancedAnalyticsSection } from './advanced-analytics-section';

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
    <div className="p-4">
      {/* Header with Billing Period */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">Usage & Billing</h1>
          <span className="text-[10px] text-muted-foreground">
            {format(monthStart, 'MMM d')} - {format(monthEnd, 'MMM d, yyyy')}
          </span>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
          <Link href="/subscribe">
            <CreditCard className="mr-1.5 h-3 w-3" />
            Manage
          </Link>
        </Button>
      </div>

      {/* Stats Grid - Compact */}
      <div className="mb-4 grid gap-3 grid-cols-2 lg:grid-cols-4">
        {/* Monthly Verifications */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Verifications</span>
            <Activity className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="mt-1 text-lg font-semibold">
            {stats.monthlyVerifications}
            <span className="text-xs font-normal text-muted-foreground">
              {' '}/ {stats.verificationsLimit === Infinity ? '∞' : stats.verificationsLimit}
            </span>
          </div>
          <Progress value={usagePercentage} className="mt-1 h-1" />
        </Card>

        {/* Tokens Used */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Tokens Used</span>
            <Zap className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="mt-1 text-lg font-semibold">{stats.monthlyTokens.toLocaleString()}</div>
          <p className="text-[10px] text-muted-foreground">This month</p>
        </Card>

        {/* API Cost */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">API Cost</span>
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="mt-1 text-lg font-semibold">${(stats.monthlyCost / 100).toFixed(2)}</div>
          <p className="text-[10px] text-muted-foreground">LLM usage</p>
        </Card>

        {/* Plan */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Plan</span>
            <CreditCard className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-lg font-semibold">{capitalize(organization.planType)}</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">Active</Badge>
          </div>
          {organization.planType === 'free' && (
            <Link href="/subscribe" className="text-[10px] text-primary hover:underline">
              Upgrade
            </Link>
          )}
        </Card>
      </div>

      {/* Usage Breakdown */}
      <div className="grid gap-4 lg:grid-cols-2 mb-4">
        {/* Usage by Provider */}
        <Card>
          <div className="border-b px-4 py-2.5">
            <h3 className="text-xs font-semibold">Usage by Provider</h3>
          </div>
          <div className="p-3">
            {usageByProvider.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <BarChart3 className="mb-2 h-6 w-6 text-muted-foreground/30" />
                <p className="text-[10px] text-muted-foreground">No usage data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {usageByProvider.map((p) => (
                  <div key={p.provider} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium capitalize">{p.provider}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {p.totalTokens.toLocaleString()} tokens
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{p.count} requests</span>
                      <span>${(p.totalCost / 100).toFixed(4)}</span>
                    </div>
                    <Progress
                      value={stats.monthlyTokens > 0 ? (p.totalTokens / stats.monthlyTokens) * 100 : 0}
                      className="h-1"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Usage by Model */}
        <Card>
          <div className="border-b px-4 py-2.5">
            <h3 className="text-xs font-semibold">Usage by Model</h3>
          </div>
          <div className="p-2">
            {usageByModel.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <BarChart3 className="mb-2 h-6 w-6 text-muted-foreground/30" />
                <p className="text-[10px] text-muted-foreground">No usage data yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {usageByModel.slice(0, 5).map((m) => (
                  <div
                    key={`${m.provider}-${m.model}`}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-xs font-medium">{m.model}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{m.provider}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">{m.totalTokens.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">${(m.totalCost / 100).toFixed(4)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

      {/* Advanced Analytics Section */}
      <AdvancedAnalyticsSection />

      {/* Recent Usage */}
      <Card className="mt-4">
        <div className="border-b px-4 py-2.5">
          <h3 className="text-xs font-semibold">Recent API Calls</h3>
        </div>
        <div className="p-2">
          {recentUsage.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Activity className="mb-2 h-6 w-6 text-muted-foreground/30" />
              <p className="text-[10px] text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-[10px] font-medium text-muted-foreground">
                    <th className="pb-2 pr-4">Provider</th>
                    <th className="pb-2 pr-4">Model</th>
                    <th className="pb-2 pr-4 text-right">Input</th>
                    <th className="pb-2 pr-4 text-right">Output</th>
                    <th className="pb-2 pr-4 text-right">Cost</th>
                    <th className="pb-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {recentUsage.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 capitalize">{u.provider}</td>
                      <td className="py-2 pr-4 font-mono text-[10px]">{u.model}</td>
                      <td className="py-2 pr-4 text-right">{u.inputTokens.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right">{u.outputTokens.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right">${(u.costCents / 100).toFixed(4)}</td>
                      <td className="py-2 text-right text-muted-foreground">
                        {formatRelativeTime(u.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
