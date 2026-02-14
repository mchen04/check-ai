import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Parameter {
  name: string;
  type: string;
  required?: boolean;
  description: string;
  default?: string;
}

interface ParameterTableProps {
  parameters: Parameter[];
  title?: string;
  className?: string;
}

export function ParameterTable({ parameters = [], title, className }: ParameterTableProps) {
  return (
    <div className={cn('my-6', className)}>
      {title && (
        <h4 className="mb-3 text-sm font-semibold">{title}</h4>
      )}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Parameter</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-left font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {parameters.map((param) => (
              <tr key={param.name}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                      {param.name}
                    </code>
                    {param.required && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        required
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs text-muted-foreground">{param.type}</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {param.description}
                  {param.default && (
                    <span className="ml-1 text-xs">
                      (default: <code className="rounded bg-muted px-1">{param.default}</code>)
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
