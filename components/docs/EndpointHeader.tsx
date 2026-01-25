import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface EndpointHeaderProps {
  method: HttpMethod;
  path: string;
  description?: string;
  className?: string;
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-info/10 text-info border-info/30',
  POST: 'bg-success/10 text-success border-success/30',
  PUT: 'bg-warning/10 text-warning border-warning/30',
  PATCH: 'bg-primary/10 text-primary border-primary/30',
  DELETE: 'bg-destructive/10 text-destructive border-destructive/30',
};

export function EndpointHeader({ method, path, description, className }: EndpointHeaderProps) {
  return (
    <div className={cn('my-6', className)}>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
        <Badge
          variant="outline"
          className={cn('font-mono text-xs font-bold', METHOD_COLORS[method])}
        >
          {method}
        </Badge>
        <code className="flex-1 font-mono text-sm">{path}</code>
      </div>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
