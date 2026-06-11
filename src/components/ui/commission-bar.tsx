import * as React from "react";

import { cn } from "@/lib/utils";

export type CommissionSlice = {
  key: string;
  label: string;
  amountCents: number;
  pct: number;
};

const palette: Array<{ className: string }> = [
  { className: "bg-primary" },
  { className: "bg-brand-teal-600" },
  { className: "bg-brand-orange" },
  { className: "bg-brand-purple" },
  { className: "bg-brand-blue" },
  { className: "bg-brand-green" },
  { className: "bg-brand-rose" },
];

function formatAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format((amountCents ?? 0) / 100);
}

export function CommissionBar({
  slices,
  currency = "EGP",
  className,
}: {
  slices: CommissionSlice[];
  currency?: string;
  className?: string;
}) {
  const total = slices.reduce((acc, s) => acc + (s.pct ?? 0), 0) || 1;
  return (
    <div className={cn("space-y-3", className)}>
      <div
        role="img"
        aria-label="توزيع العمولات"
        className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
      >
        {slices.map((slice, index) => (
          <div
            key={slice.key}
            style={{ width: `${((slice.pct ?? 0) / total) * 100}%` }}
            className={cn("h-full", palette[index % palette.length].className)}
            title={`${slice.label} • ${slice.pct}%`}
          />
        ))}
      </div>
      <ul className="space-y-2.5">
        {slices.map((slice, index) => (
          <li
            key={slice.key}
            className="flex items-center gap-2.5 text-[12.5px]"
          >
            <span
              className={cn(
                "size-3 shrink-0 rounded",
                palette[index % palette.length].className,
              )}
            />
            <span className="flex-1 text-ink">{slice.label}</span>
            <span className="text-[11px] text-ink-muted">{slice.pct}%</span>
            <span className="font-extrabold text-ink-strong">
              {formatAmount(slice.amountCents, currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
