'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { ParadigmFPRData } from '@/lib/analytics';
import { paradigmChartConfig } from './chart-config';

interface FPRChartProps {
  data: ParadigmFPRData[];
  threshold?: number; // Default 10% threshold line
}

export function FPRChart({ data, threshold = 0.1 }: FPRChartProps) {
  // Guard against empty/undefined data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[160px] text-muted-foreground text-xs">
        No data available
      </div>
    );
  }

  // Sort by FPR descending (worst performers first)
  const sortedData = [...data].sort((a, b) => b.fpr - a.fpr);

  // Transform data for the bar chart
  const chartData = sortedData.map((d) => ({
    ...d,
    fprPercent: d.fpr * 100,
    accuracyPercent: d.accuracy * 100,
    fill:
      paradigmChartConfig[d.paradigmType as keyof typeof paradigmChartConfig]
        ?.color || 'hsl(var(--chart-1))',
  }));

  const config = {
    fprPercent: {
      label: 'False Positive Rate',
      color: 'hsl(var(--chart-3))',
    },
  };

  return (
    <ChartContainer config={config} className="min-h-[160px] w-full">
      <BarChart
        accessibilityLayer
        data={chartData}
        layout="vertical"
        margin={{ left: 0, right: 24 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <YAxis
          dataKey="displayName"
          type="category"
          tickLine={false}
          axisLine={false}
          width={65}
          tickMargin={4}
          tick={{ fontSize: 10 }}
        />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          domain={[0, Math.max(threshold * 100 * 2, 25)]}
          tickFormatter={(value) => `${value}%`}
          tick={{ fontSize: 10 }}
        />
        <ReferenceLine
          x={threshold * 100}
          stroke="hsl(var(--destructive))"
          strokeDasharray="5 5"
          strokeWidth={2}
          label={{
            value: `${threshold * 100}% threshold`,
            position: 'top',
            fill: 'hsl(var(--destructive))',
            fontSize: 12,
          }}
        />
        <ChartTooltip
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
          content={
            <ChartTooltipContent
              formatter={(value, name, props) => {
                const item = props.payload;
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">FPR:</span>
                      <span className="font-mono font-medium">
                        {Number(value).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Accuracy:</span>
                      <span className="font-mono font-medium">
                        {item.accuracyPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        False Positives:
                      </span>
                      <span className="font-mono font-medium">
                        {item.falsePositives.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        Total Resolved:
                      </span>
                      <span className="font-mono font-medium">
                        {item.totalResolved.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
          }
        />
        <Bar dataKey="fprPercent" radius={[0, 4, 4, 0]} fill="var(--color-fprPercent)" />
      </BarChart>
    </ChartContainer>
  );
}
