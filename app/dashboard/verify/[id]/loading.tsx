import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function VerificationDetailLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      {/* Status Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-16 w-16 rounded-full" />
        </div>
      </Card>

      {/* Content Card */}
      <Card className="p-6">
        <Skeleton className="mb-4 h-5 w-24" />
        <Skeleton className="h-32 w-full" />
      </Card>

      {/* Paradigm Results */}
      <Card className="p-6">
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
