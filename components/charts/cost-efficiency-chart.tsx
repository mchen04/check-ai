'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { paradigmChartConfig } from './chart-config';
import type { CostEfficiencyData } from '@/lib/analytics/types';

interface CostEfficiencyChartProps {
  data: CostEfficiencyData[];
}

export function CostEfficiencyChart({ data }: CostEfficiencyChartProps) {
  // Guard against empty/undefined data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No data available
      </div>
    );
  }

  // Sort by efficiency score descending (best performers first)
  const sortedData = [...data].sort(
    (a, b) => b.efficiencyScore - a.efficiencyScore
  );

  // Transform data for the bar chart
  const chartData = sortedData.map((d) => ({
    ...d,
    costPerAccurateDollars: d.costPerAccurateVerification / 100,
    costPerVerificationDollars: d.costPerVerification / 100,
    fill:
      paradigmChartConfig[d.paradigmType as keyof typeof paradigmChartConfig]
        ?.color || 'hsl(var(--chart-1))',
  }));

  const config = {
    costPerAccurateDollars: {
      label: 'Cost per Accurate Verification',
      color: 'hsl(var(--chart-2))',
    },
  };

  return (
    <ChartContainer config={config} className="min-h-[300px] w-full">
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
          tickFormatter={(value) => `$${value.toFixed(3)}`}
        />
        <ChartTooltip
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
          content={
            <ChartTooltipContent
              formatter={(value, name, props) => {
                const item = props.payload;
                const hasVerifiedData = item.verifiedTotalCount > 0;
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        Cost/Accurate:
                      </span>
                      <span className="font-mono font-medium">
                        ${Number(value).toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        Cost/Verification:
                      </span>
                      <span className="font-mono font-medium">
                        ${item.costPerVerificationDollars.toFixed(4)}
                      </span>
                    </div>
                    {hasVerifiedData && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">
                          Verified Accuracy:
                        </span>
                        <span className="font-mono font-medium text-green-600">
                          {(item.verifiedAccuracy * 100).toFixed(1)}%
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({item.verifiedTotalCount})
                          </span>
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        {hasVerifiedData ? 'Est. Accuracy:' : 'Accuracy:'}
                      </span>
                      <span className="font-mono font-medium">
                        {(item.estimatedAccuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Total Cost:</span>
                      <span className="font-mono font-medium">
                        ${(item.totalCostCents / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        Verifications:
                      </span>
                      <span className="font-mono font-medium">
                        {item.totalVerifications.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        Efficiency Score:
                      </span>
                      <span className="font-mono font-medium">
                        {item.efficiencyScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
          }
        />
        <Bar
          dataKey="costPerAccurateDollars"
          radius={[0, 4, 4, 0]}
          fill="var(--color-costPerAccurateDollars)"
        />
      </BarChart>
    </ChartContainer>
  );
}
