import { cn } from "@/lib/utils";

export function TableSkeleton({
  rows = 6,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="جار تحميل الجدول"
      className={cn("space-y-2", className)}
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-3 rounded-2xl border border-border bg-card p-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((__, colIndex) => (
            <div
              key={colIndex}
              className="h-4 animate-pulse rounded-md bg-muted"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
