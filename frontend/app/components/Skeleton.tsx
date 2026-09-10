export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800 ${className}`} />;
}

export function TableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full max-w-full overflow-hidden rounded-xl border border-neutral-200/60 bg-white/80 dark:border-neutral-800/60 dark:bg-neutral-950/50">
      <div className="flex gap-4 border-b border-neutral-200/60 px-4 py-3.5 dark:border-neutral-800/60">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-neutral-100/80 px-4 py-4 last:border-b-0 dark:border-neutral-800/40">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="grid gap-2 rounded-[18px] border border-neutral-300 bg-white/90 p-4 md:p-5 dark:border-neutral-700 dark:bg-neutral-900/90"
        >
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-12" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 bg-white/70 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/70">
          <div className="flex items-center justify-between gap-3">
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
