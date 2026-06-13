import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ApprovalCard({
  logo,
  logoClassName,
  name,
  meta,
  onView,
  onApprove,
  onReject,
  className,
}: {
  logo: React.ReactNode;
  logoClassName?: string;
  name: React.ReactNode;
  meta?: React.ReactNode;
  onView?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-border p-3.5 transition hover:border-primary hover:shadow-sm",
        className,
      )}
    >
      <div
        className={cn(
          "grid size-[52px] shrink-0 place-items-center rounded-xl text-[18px] font-extrabold text-white",
          logoClassName ??
            "bg-gradient-to-br from-brand-yellow-300 to-brand-orange",
        )}
      >
        {logo}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold text-ink-strong">{name}</div>
        {meta ? (
          <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[11px] text-ink-muted">
            {meta}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {onView ? (
          <Button size="sm" variant="secondary" onClick={onView}>
            عرض
          </Button>
        ) : null}
        {onReject ? (
          <Button size="sm" variant="outline-danger" onClick={onReject}>
            رفض
          </Button>
        ) : null}
        {onApprove ? (
          <Button size="sm" variant="primary" onClick={onApprove}>
            موافقة
          </Button>
        ) : null}
      </div>
    </div>
  );
}
