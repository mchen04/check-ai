'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import dynamic from 'next/dynamic';
import { BarChart3, RefreshCw, AlertCircle } from 'lucide-react';
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
import { getErrorMessage } from '@/lib/utils';
import { TimeRangeSelector } from '@/components/charts/time-range-selector';
import type { TimeRange, AnalyticsData } from '@/lib/analytics';

// Dynamic imports for heavy chart components (uses Recharts ~200KB)
const VerificationTrendsChart = dynamic(
  () => import('@/components/charts/verification-trends-chart').then((mod) => mod.VerificationTrendsChart),
  { loading: () => <Skeleton className="h-[180px] w-full" />, ssr: false }
);
const VerdictDistributionChart = dynamic(
  () => import('@/components/charts/verdict-distribution-chart').then((mod) => mod.VerdictDistributionChart),
  { loading: () => <Skeleton className="h-[180px] w-full" />, ssr: false }
);
const ParadigmPerformanceChart = dynamic(
  () => import('@/components/charts/paradigm-performance-chart').then((mod) => mod.ParadigmPerformanceChart),
  { loading: () => <Skeleton className="h-[180px] w-full" />, ssr: false }
);
const CostBreakdownChart = dynamic(
  () => import('@/components/charts/cost-breakdown-chart').then((mod) => mod.CostBreakdownChart),
  { loading: () => <Skeleton className="h-[180px] w-full" />, ssr: false }
);
const ProcessingTimeChart = dynamic(
  () => import('@/components/charts/processing-time-chart').then((mod) => mod.ProcessingTimeChart),
  { loading: () => <Skeleton className="h-[180px] w-full" />, ssr: false }
);

// Memoized skeleton component to prevent re-renders (rerender-memo)
const ChartSkeleton = memo(function ChartSkeleton({ height = 'h-[180px]' }: { height?: string }) {
  return <Skeleton className={`${height} w-full`} />;
});

// Memoized empty state component
const ChartEmptyState = memo(function ChartEmptyState({ message = 'No data available' }: { message?: string }) {
  return <EmptyState icon={BarChart3} message={message} size="sm" />;
});

// Memoized error state component
const ChartErrorState = memo(function ChartErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <ErrorState icon={AlertCircle} message={message} onRetry={onRetry} />;
});

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

  return (
    <div className="mb-6 space-y-4">
      {/* Header with time selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Analytics</h2>
          <p className="text-xs text-muted-foreground">
            Trends and performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchAnalytics}
            disabled={isLoading}
            aria-label="Refresh analytics"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <TimeRangeSelector value={range} onChange={setRange} />
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="p-6">
            <ChartErrorState message={error} onRetry={fetchAnalytics} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {/* Top Row - Verification Trends + Method Performance */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Verification Trends</CardTitle>
                <CardDescription className="text-xs">Daily volume by status</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
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
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Method Performance</CardTitle>
                <CardDescription className="text-xs">Success rate by method</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Verdict Distribution</CardTitle>
                <CardDescription className="text-xs">Success/failure rates</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
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
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Cost Breakdown</CardTitle>
                <CardDescription className="text-xs">API costs by provider</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
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
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Processing Time</CardTitle>
                <CardDescription className="text-xs">Avg/P95 latency</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
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
