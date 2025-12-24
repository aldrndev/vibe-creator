import { Card, CardBody, Skeleton } from '@heroui/react';

interface SkeletonCardProps {
  count?: number;
  type?: 'card' | 'row' | 'stat';
}

/**
 * Reusable skeleton loader for cards
 */
export function SkeletonCard({ count = 1, type = 'card' }: SkeletonCardProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (type === 'stat') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((i) => (
          <Card key={i}>
            <CardBody className="flex flex-row items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-6 w-16 rounded" />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  if (type === 'row') {
    return (
      <div className="space-y-3">
        {items.map((i) => (
          <Card key={i}>
            <CardBody className="flex items-center gap-4 p-4">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
              <Skeleton className="h-8 w-20 rounded-lg" />
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  // Default card grid
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((i) => (
        <Card key={i}>
          <CardBody className="space-y-3 p-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

/**
 * Table skeleton loader
 */
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  const items = Array.from({ length: rows }, (_, i) => i);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 p-3 border-b border-divider">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-4 w-16 rounded" />
      </div>
      {/* Rows */}
      {items.map((i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <div className="flex-1 flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
