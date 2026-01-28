'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface PaginationProps {
  /** Current page number (1-indexed) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Total number of items (optional, for display) */
  total?: number;
  /** Whether to show first/last page buttons */
  showFirstLast?: boolean;
  /** Whether pagination is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'default';
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Reusable pagination component with page navigation buttons.
 *
 * Features:
 * - First/Previous/Next/Last navigation buttons
 * - Current page and total pages display
 * - Optional total items count
 * - Disabled state support
 * - Size variants
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
  showFirstLast = false,
  disabled = false,
  className,
  size = 'sm',
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const isFirstPage = page === 1;
  const isLastPage = page === totalPages;

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
        {total !== undefined && ` (${total.toLocaleString()} items)`}
      </p>
      <div className="flex gap-1">
        {showFirstLast && (
          <Button
            variant="outline"
            size={size === 'sm' ? 'icon' : 'default'}
            onClick={() => onPageChange(1)}
            disabled={disabled || isFirstPage}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="outline"
          size={size === 'sm' ? 'icon' : 'default'}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={disabled || isFirstPage}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size={size === 'sm' ? 'icon' : 'default'}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={disabled || isLastPage}
          aria-label="Go to next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {showFirstLast && (
          <Button
            variant="outline"
            size={size === 'sm' ? 'icon' : 'default'}
            onClick={() => onPageChange(totalPages)}
            disabled={disabled || isLastPage}
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SIMPLE PAGINATION (Just prev/next with page info text)
// =============================================================================

export interface SimplePaginationProps {
  /** Current page number (1-indexed) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Whether pagination is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Simple pagination with just prev/next buttons.
 * Useful for smaller tables or compact layouts.
 */
export function SimplePagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  className,
}: SimplePaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const isFirstPage = page === 1;
  const isLastPage = page === totalPages;

  return (
    <div className={cn('mt-4 flex items-center justify-between', className)}>
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={disabled || isFirstPage}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={disabled || isLastPage}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default Pagination;
