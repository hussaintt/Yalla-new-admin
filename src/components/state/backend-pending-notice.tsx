import { AlertCircle, ExternalLink, Server } from "lucide-react";

import { cn } from "@/lib/utils";

export type BackendPriority = "P0" | "P1" | "P2";

const priorityTone: Record<BackendPriority, string> = {
  P0: "bg-destructive-soft text-destructive",
  P1: "bg-warning-soft text-warning",
  P2: "bg-info-soft text-info",
};

const priorityLabel: Record<BackendPriority, string> = {
  P0: "يحجب الإطلاق",
  P1: "تشغيلي",
  P2: "تحسين لاحق",
};

export function BackendPendingNotice({
  endpoint,
  priority,
  description,
  actionUrl = "/bk-gaps.md",
  className,
}: {
  endpoint: string;
  priority: BackendPriority;
  description?: string;
  actionUrl?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-2xl border border-warning/30 bg-warning-soft/40 p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning">
          <Server className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-extrabold text-ink-strong">
              قيد الانتظار من الباك إند
            </h3>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-extrabold",
                priorityTone[priority],
              )}
            >
              {priority}
            </span>
            <span className="text-[10px] font-bold text-ink-muted">
              {priorityLabel[priority]}
            </span>
          </div>
          {description ? (
            <p className="text-sm leading-7 text-ink-muted">{description}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <code
              dir="ltr"
              className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-1 text-[11px] font-mono text-ink-strong"
            >
              <AlertCircle className="h-3 w-3" />
              {endpoint}
            </code>
            <a
              href={actionUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary-soft"
            >
              موثّقة في bk-gaps.md
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
