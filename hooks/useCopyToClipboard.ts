'use client';

import { useState, useCallback } from 'react';

export interface UseCopyToClipboardOptions {
  resetDelay?: number;
}

export interface UseCopyToClipboardReturn {
  copied: boolean;
  copy: (text: string) => Promise<void>;
}

/**
 * Hook for copying text to clipboard with automatic reset
 * @param options.resetDelay - Time in ms before resetting copied state (default: 2000)
 */
export function useCopyToClipboard(
  options: UseCopyToClipboardOptions = {}
): UseCopyToClipboardReturn {
  const { resetDelay = 2000 } = options;
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetDelay);
    },
    [resetDelay]
  );

  return { copied, copy };
}

export default useCopyToClipboard;
