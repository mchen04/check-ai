'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BarChart3, RefreshCw, AlertCircle } from 'lucide-react';
import { TimeRangeSelector } from '@/components/charts/time-range-selector';
import { VerificationTrendsChart } from '@/components/charts/verification-trends-chart';
import { VerdictDistributionChart } from '@/components/charts/verdict-distribution-chart';
import { ParadigmPerformanceChart } from '@/components/charts/paradigm-performance-chart';
import { CostBreakdownChart } from '@/components/charts/cost-breakdown-chart';
import { ProcessingTimeChart } from '@/components/charts/processing-time-chart';
import type { TimeRange, AnalyticsData } from '@/lib/analytics/types';

function ChartSkeleton({ height = 'h-[300px]' }: { height?: string }) {
  return <Skeleton className={`${height} w-full`} />;
}

function EmptyState({ message = 'No data available for this period' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="mb-4 h-12 w-12 text-destructive/50" />
      <p className="mb-4 text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Try Again
      </Button>
    </div>
  );
}

export function AnalyticsSection() {
  const [range, setRange] = useState<TimeRange>('7d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dashboard/analytics?range=${range}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const hasData = data && (
    data.trends.length > 0 ||
    data.verdicts.length > 0 ||
    data.paradigms.length > 0 ||
    data.costByProvider.length > 0 ||
    data.processingTime.length > 0
  );

  return (
    <div className="mt-8 space-y-6">
      {/* Header with time selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Verification trends and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchAnalytics}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <TimeRangeSelector value={range} onChange={setRange} />
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="pt-6">
            <ErrorState message={error} onRetry={fetchAnalytics} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Verification Trends - Full Width */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Trends</CardTitle>
              <CardDescription>Daily verification volume by status</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton />
              ) : !data?.trends.length ? (
                <EmptyState />
              ) : (
                <VerificationTrendsChart data={data.trends} />
              )}
            </CardContent>
          </Card>

          {/* Two Column Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Verdict Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Verdict Distribution</CardTitle>
                <CardDescription>Success, failure, and uncertain rates</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <ChartSkeleton height="h-[250px]" />
                ) : !data?.verdicts.length ? (
                  <EmptyState />
                ) : (
                  <VerdictDistributionChart data={data.verdicts} />
                )}
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
                <CardDescription>API costs by provider</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <ChartSkeleton height="h-[250px]" />
                ) : !data?.costByProvider.length ? (
                  <EmptyState />
                ) : (
                  <CostBreakdownChart data={data.costByProvider} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Paradigm Performance - Full Width */}
          <Card>
            <CardHeader>
              <CardTitle>Method Performance</CardTitle>
              <CardDescription>
                Success rate comparison of verification methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton />
              ) : !data?.paradigms.length ? (
                <EmptyState />
              ) : (
                <ParadigmPerformanceChart data={data.paradigms} />
              )}
            </CardContent>
          </Card>

          {/* Processing Time - Full Width */}
          <Card>
            <CardHeader>
              <CardTitle>Processing Time</CardTitle>
              <CardDescription>
                Average and P95 latency metrics over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton height="h-[250px]" />
              ) : !data?.processingTime.length ? (
                <EmptyState />
              ) : (
                <ProcessingTimeChart data={data.processingTime} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
