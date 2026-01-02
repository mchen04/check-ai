'use client';

import { useEffect } from 'react';

interface BodyClassManagerProps {
  className: string;
}

/**
 * Client component to manage body classes
 * Used to add/remove classes on the body element for route-specific styling
 */
export function BodyClassManager({ className }: BodyClassManagerProps) {
  useEffect(() => {
    document.body.classList.add(className);

    return () => {
      document.body.classList.remove(className);
    };
  }, [className]);

  return null;
}

export default BodyClassManager;
