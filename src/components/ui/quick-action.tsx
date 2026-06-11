import * as React from "react";

import { cn } from "@/lib/utils";

export function QuickAction({
  icon: Icon,
  iconClassName,
  label,
  onClick,
  className,
}: {
  icon: React.ElementType;
  iconClassName?: string;
  label: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-border p-4.5 text-center transition hover:-translate-y-0.5 hover:border-primary hover:shadow-sm",
        className,
      )}
    >
      <div
        className={cn(
          "grid size-11 place-items-center rounded-xl",
          iconClassName ?? "bg-brand-teal-50 text-primary",
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="text-xs font-semibold text-ink-strong">{label}</div>
    </button>
  );
}
