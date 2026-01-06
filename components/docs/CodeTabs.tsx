'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CodeBlock } from './CodeBlock';

interface CodeExample {
  language: string;
  label: string;
  code: string;
}

interface CodeTabsProps {
  examples: CodeExample[];
  className?: string;
}

const STORAGE_KEY = 'docs-preferred-language';

export function CodeTabs({ examples, className }: CodeTabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  // Load preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const index = examples.findIndex((e) => e.language === saved);
      if (index >= 0) {
        setActiveTab(index);
      }
    }
  }, [examples]);

  function handleTabChange(index: number) {
    setActiveTab(index);
    localStorage.setItem(STORAGE_KEY, examples[index].language);
  }

  return (
    <div className={cn('my-4 overflow-hidden rounded-lg border border-border', className)}>
      {/* Tab headers */}
      <div className="flex border-b border-border bg-muted/50">
        {examples.map((example, i) => (
          <button
            key={example.language}
            onClick={() => handleTabChange(i)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === i
                ? 'border-b-2 border-primary bg-background text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {example.label}
          </button>
        ))}
      </div>

      {/* Active code block */}
      <CodeBlock
        code={examples[activeTab].code}
        language={examples[activeTab].language}
        className="border-0 rounded-none my-0"
      />
    </div>
  );
}
