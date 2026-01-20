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
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { BarChart3, RefreshCw, AlertCircle } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';
import { TimeRangeSelector } from '@/components/charts/time-range-selector';
import { VerificationTrendsChart } from '@/components/charts/verification-trends-chart';
import { VerdictDistributionChart } from '@/components/charts/verdict-distribution-chart';
import { ParadigmPerformanceChart } from '@/components/charts/paradigm-performance-chart';
import { CostBreakdownChart } from '@/components/charts/cost-breakdown-chart';
import { ProcessingTimeChart } from '@/components/charts/processing-time-chart';
import type { TimeRange, AnalyticsData } from '@/lib/analytics';

function ChartSkeleton({ height = 'h-[300px]' }: { height?: string }) {
  return <Skeleton className={`${height} w-full`} />;
}

function ChartEmptyState({ message = 'No data available for this period' }: { message?: string }) {
  return <EmptyState icon={BarChart3} message={message} size="lg" />;
}

function ChartErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <ErrorState icon={AlertCircle} message={message} onRetry={onRetry} />;
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
      setError(getErrorMessage(err));
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
            <ChartErrorState message={error} onRetry={fetchAnalytics} />
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
                <ChartEmptyState />
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
                  <ChartEmptyState />
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
                  <ChartEmptyState />
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
                <ChartEmptyState />
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
                <ChartEmptyState />
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
