import { cn } from '@/lib/utils';

/**
 * Skeleton loading placeholder with shimmer effect.
 * Uses a smooth shimmer animation for better perceived performance.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-md bg-muted relative overflow-hidden',
        // Shimmer effect using pseudo-element
        'before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-transparent before:via-muted-foreground/5 before:to-transparent',
        'before:animate-[shimmer_2s_infinite]',
        className
      )}
      {...props}
    />
  );
}

/**
 * Skeleton variants for common UI patterns
 */
function SkeletonText({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn('h-4 w-full', className)} {...props} />;
}

function SkeletonTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn('h-6 w-3/4', className)} {...props} />;
}

function SkeletonAvatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn('h-10 w-10 rounded-full', className)} {...props} />;
}

function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-3', className)} {...props}>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

function SkeletonTableRow({ columns = 4, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { columns?: number }) {
  return (
    <div className={cn('flex items-center gap-4 py-3', className)} {...props}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}

/**
 * Table-native skeleton row using <tr>/<td> for use inside <TableBody>.
 * The flex-based SkeletonTableRow can't be placed inside a <table>.
 */
function SkeletonTableRowNative({ columns = 4, className, ...props }: React.HTMLAttributes<HTMLTableRowElement> & { columns?: number }) {
  return (
    <tr className={cn('border-b border-border/50', className)} {...props}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export { Skeleton, SkeletonText, SkeletonTitle, SkeletonAvatar, SkeletonCard, SkeletonTableRow, SkeletonTableRowNative };
