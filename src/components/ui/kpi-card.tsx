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

export type KpiSize = "md" | "lg";

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
  size = "md",
  loading = false,
}: {
  icon: React.ElementType;
  tone?: KpiTone;
  trend?: { direction: "up" | "down"; label: string } | null;
  value: React.ReactNode;
  label: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  size?: KpiSize;
  loading?: boolean;
}) {
  const valueClass =
    size === "lg" ? "text-[length:var(--kpi-value-size-lg)]" : "text-[length:var(--kpi-value-size)]";

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-md",
        size === "lg" ? "p-6" : "p-5",
        className,
      )}
    >
      <div className="mb-3.5 flex items-center justify-between">
        <div
          className={cn(
            "grid place-items-center rounded-xl",
            size === "lg" ? "h-12 w-12" : "h-11 w-11",
            toneClass[tone],
          )}
        >
          <Icon className={size === "lg" ? "size-6" : "size-5"} />
        </div>
        {loading ? (
          <span
            aria-hidden
            className="h-4 w-12 animate-pulse rounded-full bg-muted"
          />
        ) : trend ? (
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
      {loading ? (
        <div
          aria-hidden
          className="h-7 w-24 animate-pulse rounded-md bg-muted"
        />
      ) : (
        <div
          className={cn(
            "font-extrabold leading-tight text-ink-strong",
            valueClass,
          )}
        >
          {value}
        </div>
      )}
      <div className="mt-1 text-xs text-ink-muted">{label}</div>
      {footer ? (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-muted">
          {footer}
        </div>
      ) : null}
    </article>
  );
}
