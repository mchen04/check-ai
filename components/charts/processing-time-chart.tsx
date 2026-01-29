'use client';

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns/format';
import { parseISO } from 'date-fns/parseISO';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import type { ProcessingTimeData } from '@/lib/analytics';
import { processingTimeChartConfig } from './chart-config';

interface ProcessingTimeChartProps {
  data: ProcessingTimeData[];
}

export function ProcessingTimeChart({ data }: ProcessingTimeChartProps) {
  // Format dates for display
  const formattedData = data.map((d) => ({
    ...d,
    displayDate: format(parseISO(d.date), 'MMM d'),
  }));

  return (
    <ChartContainer config={processingTimeChartConfig} className="min-h-[150px] w-full">
      <LineChart
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
          tickFormatter={(value) => `${value}ms`}
          tick={{ fontSize: 10 }}
          width={40}
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
              formatter={(value, name) => (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {processingTimeChartConfig[name as keyof typeof processingTimeChartConfig]?.label || name}:
                  </span>
                  <span className="font-mono font-medium">{Number(value).toFixed(0)}ms</span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="avgProcessingTime"
          stroke="var(--color-avgProcessingTime)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="p50"
          stroke="var(--color-p50)"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="p95"
          stroke="var(--color-p95)"
          strokeWidth={2}
          strokeDasharray="2 2"
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
