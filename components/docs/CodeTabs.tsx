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

// Versioned storage key - increment version when schema changes
const STORAGE_VERSION = 'v1';
const STORAGE_KEY = `docs-preferred-language:${STORAGE_VERSION}`;

export function CodeTabs({ examples, className }: CodeTabsProps) {
  // Use lazy initialization to read localStorage once on mount (rerender-lazy-state-init)
  // This avoids unnecessary useEffect and prevents hydration issues
  const [activeTab, setActiveTab] = useState(() => {
    // Only run on client side
    if (typeof window === 'undefined') return 0;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        // Build Map for O(1) lookup instead of findIndex (js-index-maps)
        const languageToIndex = new Map(examples.map((e, i) => [e.language, i]));
        const index = languageToIndex.get(saved);
        if (index !== undefined) {
          return index;
        }
      }
    } catch {
      // localStorage not available (incognito mode, storage disabled, etc.)
    }
    return 0;
  });

  function handleTabChange(index: number) {
    setActiveTab(index);
    try {
      localStorage.setItem(STORAGE_KEY, examples[index].language);
    } catch {
      // localStorage not available (incognito mode, storage disabled, quota exceeded, etc.)
    }
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
