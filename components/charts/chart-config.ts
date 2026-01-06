import type { ChartConfig } from '@/components/ui/chart';

// Verification trends chart config
export const trendsChartConfig = {
  total: {
    label: 'Total',
    color: 'hsl(var(--chart-1))',
  },
  completed: {
    label: 'Completed',
    color: 'hsl(var(--chart-2))',
  },
  failed: {
    label: 'Failed',
    color: 'hsl(var(--chart-3))',
  },
  escalated: {
    label: 'Escalated',
    color: 'hsl(var(--chart-4))',
  },
} satisfies ChartConfig;

// Verdict distribution chart config
export const verdictChartConfig = {
  true: {
    label: 'Verified True',
    color: 'hsl(var(--chart-2))',
  },
  false: {
    label: 'Verified False',
    color: 'hsl(var(--chart-3))',
  },
  uncertain: {
    label: 'Uncertain',
    color: 'hsl(var(--chart-4))',
  },
} satisfies ChartConfig;

// Paradigm performance chart config
export const paradigmChartConfig = {
  semantic: {
    label: 'Semantic',
    color: 'hsl(var(--chart-1))',
  },
  reasoning: {
    label: 'Reasoning',
    color: 'hsl(var(--chart-2))',
  },
  tool: {
    label: 'Tool',
    color: 'hsl(var(--chart-3))',
  },
  biprm: {
    label: 'BiPRM',
    color: 'hsl(var(--chart-4))',
  },
  ensemble: {
    label: 'Ensemble',
    color: 'hsl(var(--chart-5))',
  },
  entropy: {
    label: 'Entropy',
    color: 'hsl(195 100% 50%)',
  },
  formal: {
    label: 'Formal',
    color: 'hsl(180 100% 50%)',
  },
} satisfies ChartConfig;

// Cost breakdown chart config
export const costChartConfig = {
  openai: {
    label: 'OpenAI',
    color: 'hsl(var(--chart-1))',
  },
  anthropic: {
    label: 'Anthropic',
    color: 'hsl(var(--chart-2))',
  },
  google: {
    label: 'Google',
    color: 'hsl(var(--chart-3))',
  },
  deepseek: {
    label: 'DeepSeek',
    color: 'hsl(var(--chart-4))',
  },
  groq: {
    label: 'Groq',
    color: 'hsl(var(--chart-5))',
  },
  together: {
    label: 'Together',
    color: 'hsl(195 100% 50%)',
  },
  mistral: {
    label: 'Mistral',
    color: 'hsl(180 100% 50%)',
  },
  cohere: {
    label: 'Cohere',
    color: 'hsl(30 100% 50%)',
  },
} satisfies ChartConfig;

// Processing time chart config
export const processingTimeChartConfig = {
  avgProcessingTime: {
    label: 'Average',
    color: 'hsl(var(--chart-1))',
  },
  p50: {
    label: 'P50 (Median)',
    color: 'hsl(var(--chart-2))',
  },
  p95: {
    label: 'P95',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

// FPR chart config
export const fprChartConfig = {
  fprPercent: {
    label: 'False Positive Rate',
    color: 'hsl(var(--chart-3))', // Red/warning color
  },
  accuracyPercent: {
    label: 'Accuracy',
    color: 'hsl(var(--chart-2))', // Green/success color
  },
} satisfies ChartConfig;

// Cost efficiency chart config
export const costEfficiencyChartConfig = {
  costPerAccurateDollars: {
    label: 'Cost per Accurate Verification',
    color: 'hsl(var(--chart-2))',
  },
  costPerVerificationDollars: {
    label: 'Cost per Verification',
    color: 'hsl(var(--chart-1))',
  },
  efficiencyScore: {
    label: 'Efficiency Score',
    color: 'hsl(var(--chart-4))',
  },
} satisfies ChartConfig;

// Calibration chart config
export const calibrationChartConfig = {
  confidence: {
    label: 'Predicted Confidence',
    color: 'hsl(var(--chart-1))',
  },
  accuracy: {
    label: 'Actual Accuracy',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;
