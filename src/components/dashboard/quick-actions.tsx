"use client";

import * as React from "react";
import Link from "next/link";
import {
  Banknote,
  Ban,
  Bell,
  CreditCard,
  FilePlus,
  FileText,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Wallet,
} from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import type { QuickAction as QuickActionDef } from "@/lib/api/types";

const staticActions: Array<{
  key: string;
  label: string;
  icon: React.ElementType;
  iconClassName: string;
  href: string;
}> = [
  {
    key: "add-vendor",
    label: "إضافة بائع جديد",
    icon: Plus,
    iconClassName: "bg-brand-teal-50 text-primary",
    href: "/vendors",
  },
  {
    key: "review-kyc",
    label: "مراجعة KYC",
    icon: ShieldCheck,
    iconClassName: "bg-brand-orange-50 text-brand-orange",
    href: "/verifications",
  },
  {
    key: "review-order",
    label: "مراجعة طلب",
    icon: ShoppingCart,
    iconClassName: "bg-brand-blue-50 text-brand-blue",
    href: "/orders",
  },
  {
    key: "edit-commission",
    label: "تعديل عمولة",
    icon: Banknote,
    iconClassName: "bg-brand-green-50 text-brand-green",
    href: "/billing/overview",
  },
  {
    key: "send-notification",
    label: "إرسال إشعار",
    icon: Bell,
    iconClassName: "bg-brand-purple-50 text-brand-purple",
    href: "/notifications",
  },
  {
    key: "create-report",
    label: "إنشاء تقرير",
    icon: FileText,
    iconClassName: "bg-brand-pink-50 text-brand-pink",
    href: "/reports",
  },
  {
    key: "close-billing",
    label: "إغلاق دورة فوترة",
    icon: Wallet,
    iconClassName: "bg-brand-amber-50 text-brand-amber",
    href: "/billing/overview",
  },
  {
    key: "ban-vendor",
    label: "حظر/إيقاف",
    icon: Ban,
    iconClassName: "bg-brand-rose-50 text-brand-rose",
    href: "/vendors",
  },
];

const iconMap: Record<string, React.ElementType> = {
  Plus,
  ShieldCheck,
  ShoppingCart,
  Banknote,
  Bell,
  FileText,
  FilePlus,
  Wallet,
  CreditCard,
  Ban,
};

export function QuickActionsGrid({ actions }: { actions?: QuickActionDef[] }) {
  const items = React.useMemo(() => {
    if (actions && actions.length > 0) {
      return actions
        .map((a) => {
          const Icon = iconMap[a.icon] ?? FilePlus;
          return {
            key: a.key,
            label: a.label,
            icon: Icon,
            iconClassName: a.iconClassName ?? "bg-brand-teal-50 text-primary",
            href: a.href ?? "#",
          };
        })
        .filter((item) => item.href);
    }
    return staticActions;
  }, [actions]);

  return (
    <SectionCard
      title="إجراءات سريعة"
      description="العمليات الأكثر استخداماً"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-center transition hover:-translate-y-0.5 hover:border-primary hover:shadow-sm"
          >
            <div
              className={`grid size-11 place-items-center rounded-xl ${item.iconClassName}`}
            >
              <item.icon className="size-5" />
            </div>
            <div className="text-xs font-semibold text-ink-strong">{item.label}</div>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}
