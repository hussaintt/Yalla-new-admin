import * as React from "react";

import { cn } from "@/lib/utils";

export function GeoRow({
  name,
  value,
  fillPct,
  className,
}: {
  name: React.ReactNode;
  value: React.ReactNode;
  fillPct: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, fillPct));
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex justify-between text-xs">
        <span className="font-bold text-ink-strong">{name}</span>
        <span className="font-extrabold text-primary">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-brand-teal-600"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
