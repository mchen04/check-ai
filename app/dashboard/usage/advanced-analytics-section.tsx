'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import dynamic from 'next/dynamic';
import {
  BarChart3,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Target,
  DollarSign,
  Activity,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { getErrorMessage } from '@/lib/utils';
import { TimeRangeSelector } from '@/components/charts/time-range-selector';
import type { TimeRange, AdvancedAnalyticsData } from '@/lib/analytics';

// Dynamic imports for heavy chart components (uses Recharts ~200KB)
const FPRChart = dynamic(
  () => import('@/components/charts/fpr-chart').then((mod) => mod.FPRChart),
  { loading: () => <Skeleton className="h-[160px] w-full" />, ssr: false }
);
const CostEfficiencyChart = dynamic(
  () => import('@/components/charts/cost-efficiency-chart').then((mod) => mod.CostEfficiencyChart),
  { loading: () => <Skeleton className="h-[160px] w-full" />, ssr: false }
);
const CalibrationChart = dynamic(
  () => import('@/components/charts/calibration-chart').then((mod) => mod.CalibrationChart),
  { loading: () => <Skeleton className="h-[160px] w-full" />, ssr: false }
);

// Memoized skeleton component to prevent re-renders (rerender-memo)
const ChartSkeleton = memo(function ChartSkeleton({ height = 'h-[160px]' }: { height?: string }) {
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

// Badge configs moved outside to avoid recreation (rerender-memo-with-default-value)
const BADGE_HIGH = { label: 'High', variant: 'destructive' } as const;
const BADGE_GOOD = { label: 'Good', variant: 'secondary' } as const;

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  badge?: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' };
}

// Memoized SummaryCard to prevent re-renders (rerender-memo)
const SummaryCard = memo(function SummaryCard({ title, value, icon, description, badge }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <span className="text-xs font-medium">{title}</span>
          </div>
          {badge && <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>}
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold">{value}</span>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export function AdvancedAnalyticsSection() {
  const [range, setRange] = useState<TimeRange>('7d');
  const [data, setData] = useState<AdvancedAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchAdvancedAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dashboard/analytics?range=${range}&advanced=true`
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load advanced analytics');
      }
      const result = await response.json();
      setData(result.advanced);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (isExpanded) {
      fetchAdvancedAnalytics();
    }
  }, [fetchAdvancedAnalytics, isExpanded]);

  const summary = data?.advancedSummary;

  return (
    <div className="mb-6">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 py-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Activity className="h-4 w-4" />
                    Advanced Analytics
                    <Badge variant="secondary" className="text-xs">
                      Beta
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    FPR analysis, cost efficiency, and calibration
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-4 border-t pt-4 px-4">
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={fetchAdvancedAnalytics}
                    disabled={isLoading}
                    aria-label="Refresh advanced analytics"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                    />
                  </Button>
                  <TimeRangeSelector value={range} onChange={setRange} />
                </div>
              </div>

              {error ? (
                <ChartErrorState message={error} onRetry={fetchAdvancedAnalytics} />
              ) : (
                <>
                  {/* Summary Cards */}
                  {summary && !isLoading && (
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                      <SummaryCard
                        title="Overall FPR"
                        value={`${(summary.overallFPR * 100).toFixed(1)}%`}
                        icon={<Target className="h-4 w-4" />}
                        badge={summary.overallFPR > 0.1 ? BADGE_HIGH : BADGE_GOOD}
                      />
                      <SummaryCard
                        title="Best Paradigm"
                        value={summary.bestPerformingParadigm || 'N/A'}
                        icon={<Activity className="h-4 w-4" />}
                        description="By accuracy"
                      />
                      <SummaryCard
                        title="Most Efficient"
                        value={summary.mostCostEfficient || 'N/A'}
                        icon={<DollarSign className="h-4 w-4" />}
                        description="Cost per accurate"
                      />
                      <SummaryCard
                        title="Calibration Error"
                        value={`${(summary.avgCalibrationError * 100).toFixed(1)}%`}
                        icon={<BarChart3 className="h-4 w-4" />}
                        badge={summary.avgCalibrationError > 0.1 ? BADGE_HIGH : BADGE_GOOD}
                      />
                    </div>
                  )}

                  {/* Charts - Side by side layout */}
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* FPR by Paradigm */}
                    <Card>
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm">FPR by Method</CardTitle>
                        <CardDescription className="text-xs">
                          Lower is better (10% threshold)
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        {isLoading ? (
                          <ChartSkeleton />
                        ) : !data?.paradigmFPR.length ? (
                          <ChartEmptyState message="No resolved escalations yet" />
                        ) : (
                          <FPRChart data={data.paradigmFPR} threshold={0.1} />
                        )}
                      </CardContent>
                    </Card>

                    {/* Cost Efficiency */}
                    <Card>
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm">Cost Efficiency</CardTitle>
                        <CardDescription className="text-xs">
                          Cost per accurate verification
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        {isLoading ? (
                          <ChartSkeleton />
                        ) : !data?.costEfficiency.length ? (
                          <ChartEmptyState />
                        ) : (
                          <CostEfficiencyChart data={data.costEfficiency} />
                        )}
                      </CardContent>
                    </Card>

                    {/* Calibration */}
                    <Card className="lg:col-span-2">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm">Confidence Calibration</CardTitle>
                        <CardDescription className="text-xs">
                          Diagonal = perfect. Above = underconfident, below = overconfident.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        {isLoading ? (
                          <ChartSkeleton height="h-[180px]" />
                        ) : !data?.calibration.length ? (
                          <ChartEmptyState message="Not enough data for calibration" />
                        ) : (
                          <CalibrationChart data={data.calibration} />
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Calibration Details */}
                  {data?.calibration && data.calibration.length > 0 && !isLoading && (
                    <Card>
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm">Calibration Status</CardTitle>
                        <CardDescription className="text-xs">
                          Confidence vs actual accuracy by method
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="space-y-2">
                          {data.calibration.map((paradigm) => (
                            <div
                              key={paradigm.paradigmType}
                              className="flex items-center justify-between rounded-md border px-3 py-2.5"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {paradigm.displayName}
                                </span>
                                {paradigm.isOverconfident && (
                                  <Badge variant="destructive" className="text-xs">Over</Badge>
                                )}
                                {paradigm.isUnderconfident && (
                                  <Badge variant="outline" className="text-xs">Under</Badge>
                                )}
                                {!paradigm.isOverconfident &&
                                  !paradigm.isUnderconfident && (
                                    <Badge variant="secondary" className="text-xs">Good</Badge>
                                  )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                <span className="font-mono">
                                  {(paradigm.overallCalibrationError * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
