import * as React from "react";

import { cn } from "@/lib/utils";

export type HealthTone = "ok" | "warn" | "down";

const toneChipClass: Record<HealthTone, string> = {
  ok: "bg-success-soft text-success",
  warn: "bg-warning-soft text-warning",
  down: "bg-destructive-soft text-destructive",
};

const toneLabel: Record<HealthTone, string> = {
  ok: "● مستقر",
  warn: "● تحميل عالي",
  down: "● متوقف",
};

export function HealthRow({
  icon: Icon,
  iconClassName,
  name,
  meta,
  status = "ok",
  pill,
  className,
}: {
  icon: React.ElementType;
  iconClassName?: string;
  name: React.ReactNode;
  meta?: React.ReactNode;
  status?: HealthTone;
  pill?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl p-2 transition hover:bg-surface-muted/60",
        className,
      )}
    >
      <div
        className={cn(
          "grid size-9 place-items-center rounded-[10px]",
          iconClassName ?? "bg-success-soft text-success",
        )}
      >
        <Icon className="size-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-bold text-ink-strong">{name}</div>
        {meta ? <div className="mt-0.5 text-[11px] text-ink-muted">{meta}</div> : null}
      </div>
      {pill ? (
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
            toneChipClass[status],
          )}
        >
          {pill}
        </span>
      ) : (
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
            toneChipClass[status],
          )}
        >
          {toneLabel[status]}
        </span>
      )}
    </div>
  );
}
