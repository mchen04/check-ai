'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { trendsChartConfig } from './chart-config';
import type { TrendDataPoint } from '@/lib/analytics';
import { format, parseISO } from 'date-fns';

interface VerificationTrendsChartProps {
  data: TrendDataPoint[];
}

export function VerificationTrendsChart({ data }: VerificationTrendsChartProps) {
  // Format dates for display
  const formattedData = data.map((d) => ({
    ...d,
    displayDate: format(parseISO(d.date), 'MMM d'),
  }));

  return (
    <ChartContainer config={trendsChartConfig} className="min-h-[180px] w-full">
      <AreaChart
        accessibilityLayer
        data={formattedData}
        margin={{ left: 12, right: 12 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="displayDate"
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          tick={{ fontSize: 10 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          tickFormatter={(value) => value.toLocaleString()}
          tick={{ fontSize: 10 }}
          width={35}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                if (payload?.[0]?.payload?.date) {
                  return format(parseISO(payload[0].payload.date), 'MMMM d, yyyy');
                }
                return '';
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          type="monotone"
          dataKey="completed"
          stackId="1"
          fill="var(--color-completed)"
          stroke="var(--color-completed)"
          fillOpacity={0.6}
        />
        <Area
          type="monotone"
          dataKey="failed"
          stackId="1"
          fill="var(--color-failed)"
          stroke="var(--color-failed)"
          fillOpacity={0.6}
        />
        <Area
          type="monotone"
          dataKey="escalated"
          stackId="1"
          fill="var(--color-escalated)"
          stroke="var(--color-escalated)"
          fillOpacity={0.6}
        />
      </AreaChart>
    </ChartContainer>
  );
}
