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
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
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
import { getErrorMessage } from '@/lib/utils';
import { TimeRangeSelector } from '@/components/charts/time-range-selector';
import { FPRChart } from '@/components/charts/fpr-chart';
import { CostEfficiencyChart } from '@/components/charts/cost-efficiency-chart';
import { CalibrationChart } from '@/components/charts/calibration-chart';
import type { TimeRange, AdvancedAnalyticsData } from '@/lib/analytics';

function ChartSkeleton({ height = 'h-[160px]' }: { height?: string }) {
  return <Skeleton className={`${height} w-full`} />;
}

function ChartEmptyState({ message = 'No data available' }: { message?: string }) {
  return <EmptyState icon={BarChart3} message={message} size="sm" />;
}

function ChartErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <ErrorState icon={AlertCircle} message={message} onRetry={onRetry} />;
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
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {icon}
            <span className="text-[11px] font-medium">{title}</span>
          </div>
          {badge && <Badge variant={badge.variant} className="text-[9px] px-1 py-0 h-4">{badge.label}</Badge>}
        </div>
        <div className="mt-1">
          <span className="text-lg font-bold">{value}</span>
          {description && (
            <p className="text-[10px] text-muted-foreground">{description}</p>
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

  const hasData =
    data &&
    (data.paradigmFPR.length > 0 ||
      data.costEfficiency.length > 0 ||
      data.calibration.length > 0);

  const summary = data?.advancedSummary;

  return (
    <div className="mt-2">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 py-2 px-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xs">
                    <Activity className="h-3.5 w-3.5" />
                    Advanced Analytics
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                      Beta
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-[10px]">
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
            <CardContent className="space-y-3 border-t pt-3 px-3">
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={fetchAdvancedAnalytics}
                    disabled={isLoading}
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`}
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
                    <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
                      <SummaryCard
                        title="Overall FPR"
                        value={`${(summary.overallFPR * 100).toFixed(1)}%`}
                        icon={<Target className="h-3 w-3" />}
                        badge={
                          summary.overallFPR > 0.1
                            ? { label: 'High', variant: 'destructive' }
                            : { label: 'Good', variant: 'secondary' }
                        }
                      />
                      <SummaryCard
                        title="Best Paradigm"
                        value={summary.bestPerformingParadigm || 'N/A'}
                        icon={<Activity className="h-3 w-3" />}
                        description="By accuracy"
                      />
                      <SummaryCard
                        title="Most Efficient"
                        value={summary.mostCostEfficient || 'N/A'}
                        icon={<DollarSign className="h-3 w-3" />}
                        description="Cost per accurate"
                      />
                      <SummaryCard
                        title="Calibration Error"
                        value={`${(summary.avgCalibrationError * 100).toFixed(1)}%`}
                        icon={<BarChart3 className="h-3 w-3" />}
                        badge={
                          summary.avgCalibrationError > 0.1
                            ? { label: 'High', variant: 'destructive' }
                            : { label: 'Good', variant: 'secondary' }
                        }
                      />
                    </div>
                  )}

                  {/* Charts - Side by side layout */}
                  <div className="grid gap-3 lg:grid-cols-2">
                    {/* FPR by Paradigm */}
                    <Card>
                      <CardHeader className="py-2 px-3">
                        <CardTitle className="text-xs">FPR by Method</CardTitle>
                        <CardDescription className="text-[10px]">
                          Lower is better (10% threshold)
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
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
                      <CardHeader className="py-2 px-3">
                        <CardTitle className="text-xs">Cost Efficiency</CardTitle>
                        <CardDescription className="text-[10px]">
                          Cost per accurate verification
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
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
                      <CardHeader className="py-2 px-3">
                        <CardTitle className="text-xs">Confidence Calibration</CardTitle>
                        <CardDescription className="text-[10px]">
                          Diagonal = perfect. Above = underconfident, below = overconfident.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
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
                      <CardHeader className="py-2 px-3">
                        <CardTitle className="text-xs">Calibration Status</CardTitle>
                        <CardDescription className="text-[10px]">
                          Confidence vs actual accuracy by method
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-2">
                        <div className="space-y-1.5">
                          {data.calibration.map((paradigm) => (
                            <div
                              key={paradigm.paradigmType}
                              className="flex items-center justify-between rounded-md border px-2 py-1.5"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">
                                  {paradigm.displayName}
                                </span>
                                {paradigm.isOverconfident && (
                                  <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">Over</Badge>
                                )}
                                {paradigm.isUnderconfident && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">Under</Badge>
                                )}
                                {!paradigm.isOverconfident &&
                                  !paradigm.isUnderconfident && (
                                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">Good</Badge>
                                  )}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
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
