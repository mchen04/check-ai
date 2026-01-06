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
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { TimeRangeSelector } from '@/components/charts/time-range-selector';
import { FPRChart } from '@/components/charts/fpr-chart';
import { CostEfficiencyChart } from '@/components/charts/cost-efficiency-chart';
import { CalibrationChart } from '@/components/charts/calibration-chart';
import type { TimeRange, AdvancedAnalyticsData } from '@/lib/analytics/types';

function ChartSkeleton({ height = 'h-[300px]' }: { height?: string }) {
  return <Skeleton className={`${height} w-full`} />;
}

function EmptyState({
  message = 'No data available for this period',
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
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

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  badge?: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' };
}

function SummaryCard({ title, value, icon, description, badge }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <span className="text-sm font-medium">{title}</span>
          </div>
          {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold">{value}</span>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

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
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (isExpanded) {
      fetchAdvancedAnalytics();
    }
  }, [fetchAdvancedAnalytics, isExpanded]);

  const hasData =
    data &&
    (data.paradigmFPR.length > 0 ||
      data.costEfficiency.length > 0 ||
      data.calibration.length > 0);

  const summary = data?.advancedSummary;

  return (
    <div className="mt-8">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Advanced Analytics
                    <Badge variant="secondary" className="ml-2">
                      Beta
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Deep insights: FPR analysis, cost efficiency, and calibration metrics
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-6 border-t pt-6">
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={fetchAdvancedAnalytics}
                    disabled={isLoading}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                    />
                  </Button>
                  <TimeRangeSelector value={range} onChange={setRange} />
                </div>
              </div>

              {error ? (
                <ErrorState message={error} onRetry={fetchAdvancedAnalytics} />
              ) : (
                <>
                  {/* Summary Cards */}
                  {summary && !isLoading && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <SummaryCard
                        title="Overall FPR"
                        value={`${(summary.overallFPR * 100).toFixed(1)}%`}
                        icon={<Target className="h-4 w-4" />}
                        badge={
                          summary.overallFPR > 0.1
                            ? { label: 'High', variant: 'destructive' }
                            : { label: 'Good', variant: 'secondary' }
                        }
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
                        badge={
                          summary.avgCalibrationError > 0.1
                            ? { label: 'High', variant: 'destructive' }
                            : { label: 'Good', variant: 'secondary' }
                        }
                      />
                    </div>
                  )}

                  {/* Charts */}
                  <div className="space-y-6">
                    {/* FPR by Paradigm */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          False Positive Rate by Method
                        </CardTitle>
                        <CardDescription>
                          Lower is better. The 10% threshold line indicates acceptable FPR.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoading ? (
                          <ChartSkeleton />
                        ) : !data?.paradigmFPR.length ? (
                          <EmptyState message="No resolved escalations with human feedback yet" />
                        ) : (
                          <FPRChart data={data.paradigmFPR} threshold={0.1} />
                        )}
                      </CardContent>
                    </Card>

                    {/* Cost Efficiency */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Cost Efficiency by Method
                        </CardTitle>
                        <CardDescription>
                          Cost per accurate verification. Lower bars = more cost efficient.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoading ? (
                          <ChartSkeleton />
                        ) : !data?.costEfficiency.length ? (
                          <EmptyState />
                        ) : (
                          <CostEfficiencyChart data={data.costEfficiency} />
                        )}
                      </CardContent>
                    </Card>

                    {/* Calibration */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Confidence Calibration
                        </CardTitle>
                        <CardDescription>
                          Points on the diagonal line are perfectly calibrated.
                          Above = underconfident, below = overconfident.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoading ? (
                          <ChartSkeleton height="h-[350px]" />
                        ) : !data?.calibration.length ? (
                          <EmptyState message="Not enough data for calibration analysis" />
                        ) : (
                          <CalibrationChart data={data.calibration} />
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Calibration Details */}
                  {data?.calibration && data.calibration.length > 0 && !isLoading && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Calibration Status by Method
                        </CardTitle>
                        <CardDescription>
                          How well each method&apos;s confidence matches actual accuracy
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {data.calibration.map((paradigm) => (
                            <div
                              key={paradigm.paradigmType}
                              className="flex items-center justify-between rounded-lg border p-3"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-medium">
                                  {paradigm.displayName}
                                </span>
                                {paradigm.isOverconfident && (
                                  <Badge variant="destructive">Overconfident</Badge>
                                )}
                                {paradigm.isUnderconfident && (
                                  <Badge variant="outline">Underconfident</Badge>
                                )}
                                {!paradigm.isOverconfident &&
                                  !paradigm.isUnderconfident && (
                                    <Badge variant="secondary">Well Calibrated</Badge>
                                  )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Error:{' '}
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
