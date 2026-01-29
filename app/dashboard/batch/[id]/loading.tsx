import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function BatchDetailLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="mb-2 h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>

      {/* Progress */}
      <Card className="p-6">
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="h-2 w-full" />
      </Card>

      {/* Table */}
      <Card className="p-6">
        <Skeleton className="mb-4 h-6 w-24" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}
