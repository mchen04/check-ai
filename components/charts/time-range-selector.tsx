'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TimeRange } from '@/lib/analytics';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TimeRange)}>
      <SelectTrigger className="w-[90px] h-7 text-xs">
        <SelectValue placeholder="Range" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7d" className="text-xs">7 days</SelectItem>
        <SelectItem value="30d" className="text-xs">30 days</SelectItem>
        <SelectItem value="90d" className="text-xs">90 days</SelectItem>
      </SelectContent>
    </Select>
  );
}
