'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { paradigmChartConfig } from './chart-config';
import type { ParadigmCalibration, ConfidenceBucket } from '@/lib/analytics/types';

interface CalibrationChartProps {
  data: ParadigmCalibration[];
}

interface ScatterPoint {
  confidence: number;
  accuracy: number;
  paradigm: string;
  displayName: string;
  bucket: string;
  count: number;
  calibrationError: number;
  fill: string;
  // New fields for verified vs estimated accuracy
  verifiedCount: number;
  verifiedAccuracy: number;
  estimatedAccuracy: number;
}

export function CalibrationChart({ data }: CalibrationChartProps) {
  // Guard against empty/undefined data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-muted-foreground">
        No data available
      </div>
    );
  }

  // Flatten all paradigm buckets into scatter points
  const scatterData: ScatterPoint[] = [];

  for (const paradigm of data) {
    const fill =
      paradigmChartConfig[
        paradigm.paradigmType as keyof typeof paradigmChartConfig
      ]?.color || 'hsl(var(--chart-1))';

    for (const bucket of paradigm.buckets) {
      // Use verified accuracy if available, otherwise estimated
      const primaryAccuracy = bucket.verifiedCount > 0
        ? bucket.verifiedAccuracy
        : bucket.estimatedAccuracy;
      scatterData.push({
        confidence: bucket.avgConfidence * 100,
        accuracy: primaryAccuracy * 100,
        paradigm: paradigm.paradigmType,
        displayName: paradigm.displayName,
        bucket: bucket.bucket,
        count: bucket.count,
        calibrationError: bucket.calibrationError * 100,
        fill,
        verifiedCount: bucket.verifiedCount,
        verifiedAccuracy: bucket.verifiedAccuracy * 100,
        estimatedAccuracy: bucket.estimatedAccuracy * 100,
      });
    }
  }

  const config = {
    scatter: {
      label: 'Calibration',
      color: 'hsl(var(--chart-1))',
    },
  };

  return (
    <ChartContainer config={config} className="min-h-[350px] w-full">
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="confidence"
          name="Confidence"
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => `${value}%`}
          label={{
            value: 'Predicted Confidence',
            position: 'bottom',
            offset: 0,
          }}
        />
        <YAxis
          type="number"
          dataKey="accuracy"
          name="Accuracy"
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => `${value}%`}
          label={{
            value: 'Actual Accuracy',
            angle: -90,
            position: 'insideLeft',
          }}
        />
        <ZAxis
          type="number"
          dataKey="count"
          range={[50, 400]}
          name="Sample Size"
        />
        {/* Perfect calibration line (y = x) */}
        <ReferenceLine
          segment={[
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ]}
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="5 5"
          strokeWidth={2}
          label={{
            value: 'Perfect Calibration',
            position: 'insideTopRight',
            fill: 'hsl(var(--muted-foreground))',
            fontSize: 12,
          }}
        />
        <ChartTooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={
            <ChartTooltipContent
              formatter={(value, name, props) => {
                const item = props.payload;
                const hasVerifiedData = item.verifiedCount > 0;
                return (
                  <div className="space-y-1">
                    <div className="font-medium">{item.displayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.bucket}
                    </div>
                    <div className="mt-2 flex justify-between gap-4">
                      <span className="text-muted-foreground">Confidence:</span>
                      <span className="font-mono font-medium">
                        {item.confidence.toFixed(1)}%
                      </span>
                    </div>
                    {hasVerifiedData && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">
                          Verified Accuracy:
                        </span>
                        <span className="font-mono font-medium text-green-600">
                          {item.verifiedAccuracy.toFixed(1)}%
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({item.verifiedCount})
                          </span>
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        {hasVerifiedData ? 'Est. Accuracy:' : 'Accuracy:'}
                      </span>
                      <span className="font-mono font-medium">
                        {item.estimatedAccuracy.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        Calibration Error:
                      </span>
                      <span className="font-mono font-medium">
                        {item.calibrationError.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Samples:</span>
                      <span className="font-mono font-medium">
                        {item.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
          }
        />
        {/* Render a scatter for each paradigm to get different colors */}
        {data.map((paradigm) => {
          const paradigmPoints = scatterData.filter(
            (p) => p.paradigm === paradigm.paradigmType
          );
          const fill =
            paradigmChartConfig[
              paradigm.paradigmType as keyof typeof paradigmChartConfig
            ]?.color || 'hsl(var(--chart-1))';

          return (
            <Scatter
              key={paradigm.paradigmType}
              name={paradigm.displayName}
              data={paradigmPoints}
              fill={fill}
            />
          );
        })}
      </ScatterChart>
    </ChartContainer>
  );
}
