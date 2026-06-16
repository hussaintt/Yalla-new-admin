"use client";

import { useQuery } from "@tanstack/react-query";
import { Progress } from "@radix-ui/react-progress";
import Link from "next/link";

import {
  CommissionBar,
  type CommissionSlice,
} from "@/components/ui/commission-bar";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { BillingOverview, CommissionBreakdown } from "@/lib/api/types";
import { formatDate, formatMoney } from "@/lib/formatters";

export function BillingSummaryCard() {
  const overview = useQuery({
    queryKey: queryKeys.dashboard.billingOverview,
    queryFn: () => adminApi<BillingOverview>(adminPaths.billingOverview()),
  });
  const breakdown = useQuery({
    queryKey: queryKeys.dashboard.commissionBreakdown("category"),
    queryFn: () =>
      adminApi<CommissionBreakdown>(
        adminPaths.billingCommissionBreakdown("category"),
      ),
  });

  if (overview.isLoading) return <LoadingState label="جار تحميل ملخص الفوترة" />;
  if (overview.isError) return <ErrorState message={overview.error.message} />;

  const data = overview.data;
  if (!data) return <ErrorState message="لا توجد بيانات للفوترة." />;

  const currency = data.currency ?? "EGP";
  const { currentMonth, lastBilledPeriod, outstanding, restrictedVendorCount } = data;
  const slices: CommissionSlice[] = breakdown.data?.slices ?? [];
  const paidPct =
    lastBilledPeriod && lastBilledPeriod.totalCommissionCents > 0
      ? Math.round(
          (lastBilledPeriod.paidCents / lastBilledPeriod.totalCommissionCents) * 100,
        )
      : 0;

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-brand-teal-600 p-5 text-primary-foreground">
        <div
          aria-hidden
          className="absolute -top-7 -left-7 size-35 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.3),transparent_70%)]"
        />
        <div className="relative z-[2] flex items-center justify-between">
          <div className="text-sm font-bold">فوترة العمولات — {currentMonth.label}</div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              restrictedVendorCount > 0
                ? "bg-destructive/90 text-white"
                : "bg-white/20 text-white"
            }`}
          >
            {restrictedVendorCount > 0
              ? `${restrictedVendorCount} متجر موقوف`
              : "لا يوجد إيقاف"}
          </span>
        </div>
        <div className="relative z-[2] mt-1 text-[11px] text-[#ccebe6]">
          تُصدَر الفواتير تلقائياً يوم 1 من كل شهر · آخر موعد للسداد يوم 6
        </div>
        <div className="relative z-[2] mt-3">
          <div className="text-[11px] text-[#ccebe6]">مستحقات غير مدفوعة (كل الفترات)</div>
          <div className="mt-0.5 text-2xl font-extrabold text-white">
            {formatMoney(outstanding.balanceDueCents, currency)}
          </div>
          <div className="mt-1 text-[11px] text-[#ccebe6]">
            {outstanding.invoiceCount} فاتورة · منها{" "}
            <span className={outstanding.overdueInvoiceCount > 0 ? "font-bold text-brand-amber-400" : ""}>
              {outstanding.overdueInvoiceCount} متأخرة
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-[13px] font-extrabold text-ink-strong">آخر دورة فوترة</div>
          {lastBilledPeriod ? (
            <>
              <div className="mt-1 text-xs text-ink-muted">{lastBilledPeriod.label}</div>
              <div className="mt-2 flex items-center justify-between text-xs text-ink-strong">
                <span>مدفوع {formatMoney(lastBilledPeriod.paidCents, currency)}</span>
                <span className="text-ink-muted">من {formatMoney(lastBilledPeriod.totalCommissionCents, currency)}</span>
              </div>
              <Progress
                value={paidPct}
                className="mt-2 h-2 overflow-hidden rounded-full bg-muted [&>[data-slot=progress-indicator]]:bg-success"
              />
              <div className="mt-2 text-[11px] text-ink-muted">
                آخر موعد للسداد: {formatDate(lastBilledPeriod.graceEndsAt)}
              </div>
            </>
          ) : (
            <div className="mt-2 text-sm text-ink-muted">لم تُصدَر فواتير بعد.</div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-[13px] font-extrabold text-ink-strong">عمولة الشهر الحالي</div>
          <div className="mt-1 text-xs text-ink-muted">تتراكم لفاتورة الشهر القادم</div>
          <div className="mt-2 text-xl font-extrabold text-ink-strong">
            {formatMoney(currentMonth.accruedCommissionCents, currency)}
          </div>
          <div className="mt-1 text-[11px] text-ink-muted">
            {currentMonth.orderCount} طلب · تُفوتر في {formatDate(currentMonth.nextInvoiceAt)}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 text-[13px] font-extrabold text-ink-strong">
          توزيع العمولات
        </div>
        {breakdown.isLoading ? (
          <LoadingState label="جار تحميل التوزيع" />
        ) : breakdown.isError ? (
          <ErrorState message={breakdown.error.message} />
        ) : slices.length === 0 ? (
          <p className="text-sm text-ink-muted">لا توجد بيانات توزيع بعد.</p>
        ) : (
          <CommissionBar slices={slices} currency={currency} />
        )}
      </div>

      <div className="flex items-center justify-end border-t border-border pt-3">
        <Link
          href="/billing/overview"
          className="text-sm font-bold text-primary hover:underline"
        >
          تفاصيل الفوترة ←
        </Link>
      </div>
    </div>
  );
}
