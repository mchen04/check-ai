'use client';

import { useMemo, useCallback } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCopyToClipboard } from '@/hooks';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language = 'text',
  filename,
  showLineNumbers = false,
  className,
}: CodeBlockProps) {
  const { copied, copy } = useCopyToClipboard();

  // Memoize lines computation to prevent recalculation on every render (rerender-derived-state)
  const lines = useMemo(() => code.trim().split('\n'), [code]);

  // Memoize copy handler
  const handleCopy = useCallback(() => copy(code), [copy, code]);

  return (
    <div className={cn('group relative my-4 overflow-hidden rounded-lg border border-border bg-muted/50', className)}>
      {/* Header */}
      {filename && (
        <div className="flex items-center justify-between border-b border-border bg-muted px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">{filename}</span>
          <span className="text-xs text-muted-foreground">{language}</span>
        </div>
      )}

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 z-10 rounded-md border border-border bg-background p-1.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
        aria-label="Copy code"
      >
        {copied ? (
          <Check className="h-4 w-4 text-success" />
        ) : (
          <Copy className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Code */}
      <div className="overflow-x-auto p-4">
        <pre className="text-sm">
          <code className={`language-${language}`}>
            {showLineNumbers ? (
              lines.map((line, i) => (
                <div key={`line-${i + 1}-${line.slice(0, 20)}`} className="table-row">
                  <span className="table-cell select-none pr-4 text-right text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="table-cell">{line}</span>
                </div>
              ))
            ) : (
              code.trim()
            )}
          </code>
        </pre>
      </div>
    </div>
  );
}
