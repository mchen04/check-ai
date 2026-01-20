'use client';

import { Pie, PieChart, Cell } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { verdictChartConfig } from './chart-config';
import type { VerdictData } from '@/lib/analytics';

interface VerdictDistributionChartProps {
  data: VerdictData[];
}

const COLORS = {
  true: 'hsl(var(--chart-2))',
  false: 'hsl(var(--chart-3))',
  uncertain: 'hsl(var(--chart-4))',
};

export function VerdictDistributionChart({ data }: VerdictDistributionChartProps) {
  // Transform data for the pie chart
  const chartData = data.map((d) => ({
    name: d.verdict,
    value: d.count,
    percentage: d.percentage,
    fill: COLORS[d.verdict],
  }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <ChartContainer config={verdictChartConfig} className="min-h-[150px] w-full">
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {verdictChartConfig[name as keyof typeof verdictChartConfig]?.label || name}:
                  </span>
                  <span className="font-mono font-medium">
                    {Number(value).toLocaleString()} ({((Number(value) / total) * 100).toFixed(1)}%)
                  </span>
                </div>
              )}
            />
          }
        />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="45%"
          innerRadius={35}
          outerRadius={55}
          strokeWidth={2}
          stroke="hsl(var(--background))"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <ChartLegend
          content={<ChartLegendContent nameKey="name" />}
          verticalAlign="bottom"
        />
        {/* Center label */}
        <text
          x="50%"
          y="45%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground text-lg font-bold"
        >
          {total.toLocaleString()}
        </text>
        <text
          x="50%"
          y="53%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted-foreground text-[10px]"
        >
          Total
        </text>
      </PieChart>
    </ChartContainer>
  );
}
