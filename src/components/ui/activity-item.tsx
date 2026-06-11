import * as React from "react";
import {
  AlertOctagon,
  BellRing,
  CheckCircle2,
  Clock,
  type LucideIcon,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Store,
  Wallet,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type ActivityTone =
  | "vendor"
  | "order"
  | "payment"
  | "alert"
  | "kyc"
  | "neutral";

const toneClasses: Record<ActivityTone, { bg: string; text: string; icon: LucideIcon }> = {
  vendor: { bg: "bg-brand-teal-50", text: "text-brand-teal-700", icon: Store },
  order: { bg: "bg-brand-orange-50", text: "text-brand-orange", icon: ShoppingCart },
  payment: { bg: "bg-brand-green-50", text: "text-brand-green", icon: Wallet },
  alert: { bg: "bg-brand-rose-50", text: "text-brand-rose", icon: AlertOctagon },
  kyc: { bg: "bg-brand-blue-50", text: "text-brand-blue", icon: ShieldCheck },
  neutral: { bg: "bg-muted", text: "text-ink-muted", icon: Receipt },
};

export function ActivityIcon({
  tone = "neutral",
  className,
}: {
  tone?: ActivityTone;
  className?: string;
}) {
  const { bg, text, icon: Icon } = toneClasses[tone];
  return (
    <div
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full border-[3px] border-white",
        bg,
        text,
        className,
      )}
    >
      <Icon className="size-4" />
    </div>
  );
}

export function ActivityItem({
  tone = "neutral",
  text,
  time,
  children,
  className,
}: {
  tone?: ActivityTone;
  text: React.ReactNode;
  time?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-surface-muted",
        className,
      )}
    >
      <ActivityIcon tone={tone} />
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] leading-6 text-ink">{text}</div>
        {children ? <div className="mt-1">{children}</div> : null}
        {time ? (
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-muted">
            <Clock className="size-2.5" />
            {time}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ActivityTimeline({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative space-y-1 ps-0", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute top-3.5 bottom-3.5 start-[19px] w-0.5 bg-border"
      />
      <div className="relative space-y-1">{children}</div>
    </div>
  );
}

export { BellRing, CheckCircle2, XCircle };
