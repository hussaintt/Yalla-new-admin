import * as React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

export type KpiTone =
  | "teal"
  | "orange"
  | "purple"
  | "blue"
  | "green"
  | "pink"
  | "amber"
  | "rose";

const toneClass: Record<KpiTone, string> = {
  teal: "bg-brand-teal-50 text-brand-teal-700",
  orange: "bg-brand-orange-50 text-brand-orange",
  purple: "bg-brand-purple-50 text-brand-purple",
  blue: "bg-brand-blue-50 text-brand-blue",
  green: "bg-brand-green-50 text-brand-green",
  pink: "bg-brand-pink-50 text-brand-pink",
  amber: "bg-brand-amber-50 text-brand-amber",
  rose: "bg-brand-rose-50 text-brand-rose",
};

export function KpiCard({
  icon: Icon,
  tone = "teal",
  trend,
  value,
  label,
  footer,
  className,
}: {
  icon: React.ElementType;
  tone?: KpiTone;
  trend?: { direction: "up" | "down"; label: string } | null;
  value: React.ReactNode;
  label: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <div className="mb-3.5 flex items-center justify-between">
        <div
          className={cn(
            "grid h-11 w-11 place-items-center rounded-xl",
            toneClass[tone],
          )}
        >
          <Icon className="size-5" />
        </div>
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
              trend.direction === "up"
                ? "bg-success-soft text-success"
                : "bg-destructive-soft text-destructive",
            )}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {trend.label}
          </span>
        ) : null}
      </div>
      <div className="text-[26px] font-extrabold leading-tight text-ink-strong">
        {value}
      </div>
      <div className="mt-1 text-xs text-ink-muted">{label}</div>
      {footer ? (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-muted">
          {footer}
        </div>
      ) : null}
    </article>
  );
}
