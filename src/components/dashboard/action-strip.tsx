import * as React from "react";
import {
  AlertOctagon,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "danger" | "warning" | "info" | "success";

type Chip = {
  key: string;
  label: string;
  count: number;
  href: string;
  icon: React.ElementType;
  tone: Tone;
};

const toneClass: Record<
  Tone,
  { bg: string; text: string; ring: string; icon: string }
> = {
  danger: {
    bg: "bg-destructive-soft",
    text: "text-destructive",
    ring: "hover:border-destructive/40",
    icon: "bg-destructive text-destructive-foreground",
  },
  warning: {
    bg: "bg-warning-soft",
    text: "text-warning",
    ring: "hover:border-warning/40",
    icon: "bg-warning text-warning-foreground",
  },
  info: {
    bg: "bg-info-soft",
    text: "text-info",
    ring: "hover:border-info/40",
    icon: "bg-info text-info-foreground",
  },
  success: {
    bg: "bg-success-soft",
    text: "text-success",
    ring: "hover:border-success/40",
    icon: "bg-success text-success-foreground",
  },
};

function ChipLink({ chip }: { chip: Chip }) {
  const t = toneClass[chip.tone];
  const Icon = chip.icon;
  return (
    <a
      href={chip.href}
      className={cn(
        "group flex min-w-0 items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2.5 transition",
        t.ring,
      )}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg",
          t.icon,
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-ink-muted">
          {chip.label}
        </span>
        <span
          className={cn(
            "block truncate text-[15px] font-extrabold leading-tight",
            t.text,
          )}
        >
          {chip.count.toLocaleString("ar-EG-u-nu-latn")} {chip.count > 0 ? "تحتاج إجراء" : "مكتمل"}
        </span>
      </span>
    </a>
  );
}

export function ActionStrip({
  pendingKyc,
  pendingPayoutsCount,
  criticalAlerts,
  failedQueueJobs,
  pendingRefundsCount = 0,
}: {
  pendingKyc: number;
  pendingPayoutsCount: number;
  criticalAlerts: number;
  failedQueueJobs: number;
  pendingRefundsCount?: number;
}) {
  const chips: Chip[] = [
    {
      key: "kyc",
      label: "KYC بانتظار المراجعة",
      count: pendingKyc,
      href: "/verifications",
      icon: ShieldCheck,
      tone: "warning",
    },
    {
      key: "payouts",
      label: "مدفوعات معلقة للبائعين",
      count: pendingPayoutsCount,
      href: "/payouts",
      icon: CreditCard,
      tone: "info",
    },
    {
      key: "refunds",
      label: "طلبات استرداد",
      count: pendingRefundsCount,
      href: "/refunds",
      icon: Wrench,
      tone: "info",
    },
    {
      key: "alerts",
      label: "تنبيهات حرجة",
      count: criticalAlerts,
      href: "/ops/alerts",
      icon: AlertOctagon,
      tone: "danger",
    },
    {
      key: "queues",
      label: "وظائف فشلت في الطوابير",
      count: failedQueueJobs,
      href: "/ops/queues",
      icon: Wrench,
      tone: "danger",
    },
  ];

  const visibleChips = chips.filter((chip) => chip.count > 0);
  const everythingOk = visibleChips.length === 0;

  if (everythingOk) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-success/30 bg-success-soft px-5 py-3.5 text-success">
        <span className="grid size-9 place-items-center rounded-lg bg-success text-success-foreground">
          <CheckCircle2 className="size-5" />
        </span>
        <div>
          <div className="text-[13px] font-extrabold">كل شيء على ما يرام</div>
          <div className="text-[11px] text-success/80">
            لا توجد أي إجراءات عاجلة في انتظارك الآن.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="إجراءات تحتاج انتباهك"
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4"
    >
      {visibleChips.map((chip) => (
        <ChipLink key={chip.key} chip={chip} />
      ))}
    </div>
  );
}
