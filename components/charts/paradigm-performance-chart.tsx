'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { paradigmChartConfig } from './chart-config';
import type { ParadigmData } from '@/lib/analytics/types';

interface ParadigmPerformanceChartProps {
  data: ParadigmData[];
}

export function ParadigmPerformanceChart({ data }: ParadigmPerformanceChartProps) {
  // Sort by success rate descending
  const sortedData = [...data].sort((a, b) => b.successRate - a.successRate);

  // Transform data for the bar chart
  const chartData = sortedData.map((d) => ({
    ...d,
    fill: paradigmChartConfig[d.paradigmType as keyof typeof paradigmChartConfig]?.color || 'hsl(var(--chart-1))',
  }));

  return (
    <ChartContainer config={paradigmChartConfig} className="min-h-[300px] w-full">
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
          width={80}
          tickMargin={8}
        />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
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
                      <span className="text-muted-foreground">Success Rate:</span>
                      <span className="font-mono font-medium">{Number(value).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Avg Confidence:</span>
                      <span className="font-mono font-medium">{(item.avgConfidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Avg Time:</span>
                      <span className="font-mono font-medium">{item.avgProcessingTime.toFixed(0)}ms</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Total Cost:</span>
                      <span className="font-mono font-medium">${(item.totalCost / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Requests:</span>
                      <span className="font-mono font-medium">{item.count.toLocaleString()}</span>
                    </div>
                  </div>
                );
              }}
            />
          }
        />
        <Bar
          dataKey="successRate"
          radius={[0, 4, 4, 0]}
          fill="var(--color-semantic)"
        />
      </BarChart>
    </ChartContainer>
  );
}
