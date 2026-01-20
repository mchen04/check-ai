import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Verdict } from '@/lib/api/types';

/**
 * Verdict type that allows null for pending/unknown states
 */
export type VerdictDisplay = Verdict | null;

const VERDICT_SIZES = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
} as const;

interface VerdictIconProps {
  verdict: VerdictDisplay;
  size?: keyof typeof VERDICT_SIZES;
  className?: string;
}

/**
 * Display an icon for a verification verdict
 */
export function VerdictIcon({ verdict, size = 'sm', className }: VerdictIconProps) {
  const sizeClass = className || VERDICT_SIZES[size];

  switch (verdict) {
    case 'true':
      return <CheckCircle2 className={`${sizeClass} text-green-500`} />;
    case 'false':
      return <XCircle className={`${sizeClass} text-red-500`} />;
    case 'uncertain':
      return <AlertCircle className={`${sizeClass} text-yellow-500`} />;
    default:
      return <Clock className={`${sizeClass} text-muted-foreground`} />;
  }
}

/**
 * Get the color class for a verdict
 */
export function getVerdictColor(verdict: VerdictDisplay): string {
  switch (verdict) {
    case 'true':
      return 'text-green-600';
    case 'false':
      return 'text-red-600';
    case 'uncertain':
      return 'text-yellow-600';
    default:
      return 'text-muted-foreground';
  }
}

interface VerdictBadgeProps {
  verdict: VerdictDisplay;
}

/**
 * Display a badge for a verification verdict
 */
export function VerdictBadge({ verdict }: VerdictBadgeProps) {
  switch (verdict) {
    case 'true':
      return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
    case 'false':
      return <Badge className="bg-red-100 text-red-800">False</Badge>;
    case 'uncertain':
      return <Badge className="bg-yellow-100 text-yellow-800">Uncertain</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
}
