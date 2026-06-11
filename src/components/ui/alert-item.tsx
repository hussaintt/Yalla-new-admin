import * as React from "react";
import { AlertOctagon, AlertTriangle, Info } from "lucide-react";

import { cn } from "@/lib/utils";

export type AlertSeverity = "danger" | "warning" | "info";

const severityClass: Record<
  AlertSeverity,
  { card: string; icon: string; Icon: React.ElementType }
> = {
  danger: {
    card: "bg-destructive-soft border-s-4 border-s-destructive",
    icon: "text-destructive",
    Icon: AlertOctagon,
  },
  warning: {
    card: "bg-warning-soft border-s-4 border-s-warning",
    icon: "text-warning",
    Icon: AlertTriangle,
  },
  info: {
    card: "bg-info-soft border-s-4 border-s-info",
    icon: "text-info",
    Icon: Info,
  },
};

export function AlertItem({
  severity = "info",
  title,
  description,
  time,
  className,
}: {
  severity?: AlertSeverity;
  title: React.ReactNode;
  description?: React.ReactNode;
  time?: React.ReactNode;
  className?: string;
}) {
  const { card, icon, Icon } = severityClass[severity];
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl p-3 text-sm",
        card,
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", icon)} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-bold text-ink-strong">{title}</div>
        {description ? (
          <div className="mt-0.5 text-[11.5px] leading-6 text-ink-muted">
            {description}
          </div>
        ) : null}
        {time ? (
          <div className="mt-1 text-[10px] text-ink-soft">{time}</div>
        ) : null}
      </div>
    </div>
  );
}
