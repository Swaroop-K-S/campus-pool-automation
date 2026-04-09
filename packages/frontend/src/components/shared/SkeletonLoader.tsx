

interface SkeletonProps {
  className?: string;
  circle?: boolean;
}

export function Skeleton({ className = '', circle = false }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-slate-200 mt-1 ${circle ? 'rounded-full' : 'rounded-md'} ${className}`}
    />
  );
}

export function SkeletonLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <Skeleton className="h-8 w-3/4" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}
