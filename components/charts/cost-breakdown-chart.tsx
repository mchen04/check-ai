'use client';

import { Pie, PieChart, Cell } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { costChartConfig } from './chart-config';
import type { ProviderCost } from '@/lib/analytics/types';

interface CostBreakdownChartProps {
  data: ProviderCost[];
}

// Generate colors for providers
const PROVIDER_COLORS: Record<string, string> = {
  openai: 'hsl(var(--chart-1))',
  anthropic: 'hsl(var(--chart-2))',
  google: 'hsl(var(--chart-3))',
  deepseek: 'hsl(var(--chart-4))',
  groq: 'hsl(var(--chart-5))',
  together: 'hsl(195 100% 50%)',
  mistral: 'hsl(180 100% 50%)',
  cohere: 'hsl(30 100% 50%)',
  mixed: 'hsl(220 15% 60%)',
};

function getProviderColor(provider: string): string {
  return PROVIDER_COLORS[provider.toLowerCase()] || 'hsl(var(--chart-1))';
}

function capitalizeProvider(provider: string): string {
  const specialCases: Record<string, string> = {
    openai: 'OpenAI',
    deepseek: 'DeepSeek',
    groq: 'Groq',
  };
  return specialCases[provider.toLowerCase()] ||
    provider.charAt(0).toUpperCase() + provider.slice(1);
}

export function CostBreakdownChart({ data }: CostBreakdownChartProps) {
  // Transform data for the pie chart
  const chartData = data.map((d) => ({
    name: capitalizeProvider(d.provider),
    value: d.totalCost,
    tokens: d.totalTokens,
    percentage: d.percentage,
    fill: getProviderColor(d.provider),
  }));

  const totalCost = chartData.reduce((sum, d) => sum + d.value, 0);

  // Build dynamic config based on data
  const dynamicConfig = data.reduce((acc, d) => {
    const key = d.provider.toLowerCase();
    acc[key] = {
      label: capitalizeProvider(d.provider),
      color: getProviderColor(d.provider),
    };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  return (
    <ChartContainer config={{ ...costChartConfig, ...dynamicConfig }} className="min-h-[250px] w-full">
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name, props) => {
                const item = props.payload;
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Cost:</span>
                      <span className="font-mono font-medium">${(Number(value) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Tokens:</span>
                      <span className="font-mono font-medium">{item.tokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Share:</span>
                      <span className="font-mono font-medium">{item.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              }}
            />
          }
        />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
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
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground text-xl font-bold"
        >
          ${(totalCost / 100).toFixed(2)}
        </text>
        <text
          x="50%"
          y="58%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted-foreground text-xs"
        >
          Total Cost
        </text>
      </PieChart>
    </ChartContainer>
  );
}
