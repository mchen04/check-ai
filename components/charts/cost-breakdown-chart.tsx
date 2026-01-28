'use client';

import { Pie, PieChart, Cell } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import type { ProviderCost } from '@/lib/analytics';
import { costChartConfig } from './chart-config';

interface CostBreakdownChartProps {
  data: ProviderCost[];
}

// Generate colors for providers - using CSS variables for consistency
const PROVIDER_COLORS: Record<string, string> = {
  openai: 'hsl(var(--chart-1))',
  anthropic: 'hsl(var(--chart-2))',
  google: 'hsl(var(--chart-3))',
  deepseek: 'hsl(var(--chart-4))',
  groq: 'hsl(var(--chart-5))',
  together: 'hsl(var(--chart-6))',
  mistral: 'hsl(var(--chart-7))',
  cohere: 'hsl(var(--chart-8))',
  mixed: 'hsl(var(--muted-foreground))',
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
    <ChartContainer config={{ ...costChartConfig, ...dynamicConfig }} className="min-h-[150px] w-full">
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
          cy="45%"
          innerRadius={35}
          outerRadius={55}
          strokeWidth={2}
          stroke="hsl(var(--background))"
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
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
          className="fill-foreground text-base font-bold"
        >
          ${(totalCost / 100).toFixed(2)}
        </text>
        <text
          x="50%"
          y="52%"
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
