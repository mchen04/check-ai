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

function ChartSkeleton({ height = 'h-[180px]' }: { height?: string }) {
  return <Skeleton className={`${height} w-full`} />;
}

function ChartEmptyState({ message = 'No data available' }: { message?: string }) {
  return <EmptyState icon={BarChart3} message={message} size="sm" />;
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
    <div className="mt-2 space-y-2">
      {/* Header with time selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold">Analytics</h2>
          <p className="text-[10px] text-muted-foreground">
            Trends and performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={fetchAnalytics}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
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
        <div className="grid gap-3">
          {/* Top Row - Verification Trends + Method Performance */}
          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">Verification Trends</CardTitle>
                <CardDescription className="text-[10px]">Daily volume by status</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {isLoading ? (
                  <ChartSkeleton />
                ) : !data?.trends.length ? (
                  <ChartEmptyState />
                ) : (
                  <VerificationTrendsChart data={data.trends} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">Method Performance</CardTitle>
                <CardDescription className="text-[10px]">Success rate by method</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {isLoading ? (
                  <ChartSkeleton />
                ) : !data?.paradigms.length ? (
                  <ChartEmptyState />
                ) : (
                  <ParadigmPerformanceChart data={data.paradigms} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row - Three columns */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">Verdict Distribution</CardTitle>
                <CardDescription className="text-[10px]">Success/failure rates</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {isLoading ? (
                  <ChartSkeleton height="h-[150px]" />
                ) : !data?.verdicts.length ? (
                  <ChartEmptyState />
                ) : (
                  <VerdictDistributionChart data={data.verdicts} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">Cost Breakdown</CardTitle>
                <CardDescription className="text-[10px]">API costs by provider</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {isLoading ? (
                  <ChartSkeleton height="h-[150px]" />
                ) : !data?.costByProvider.length ? (
                  <ChartEmptyState />
                ) : (
                  <CostBreakdownChart data={data.costByProvider} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">Processing Time</CardTitle>
                <CardDescription className="text-[10px]">Avg/P95 latency</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {isLoading ? (
                  <ChartSkeleton height="h-[150px]" />
                ) : !data?.processingTime.length ? (
                  <ChartEmptyState />
                ) : (
                  <ProcessingTimeChart data={data.processingTime} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
