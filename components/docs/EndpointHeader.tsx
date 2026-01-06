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
  GET: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  POST: 'bg-green-500/10 text-green-600 border-green-500/30',
  PUT: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  PATCH: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  DELETE: 'bg-red-500/10 text-red-600 border-red-500/30',
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
