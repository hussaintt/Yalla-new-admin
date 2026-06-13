"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Progress } from "@radix-ui/react-progress";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ActionDialog } from "@/components/modals/action-dialog";
import { Button } from "@/components/ui/button";
import {
  CommissionBar,
  type CommissionSlice,
} from "@/components/ui/commission-bar";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import { StatusBadge } from "@/components/status/status-badge";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  BillingCycle,
  CommissionBreakdown,
} from "@/lib/api/types";
import { formatMoney } from "@/lib/formatters";

export function BillingCycleCard() {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const cycle = useQuery({
    queryKey: queryKeys.dashboard.billingCycle,
    queryFn: () => adminApi<BillingCycle>(adminPaths.billingCyclesCurrent()),
  });
  const breakdown = useQuery({
    queryKey: queryKeys.dashboard.commissionBreakdown("category"),
    queryFn: () =>
      adminApi<CommissionBreakdown>(
        adminPaths.billingCyclesCurrentCommissionBreakdown("category"),
      ),
  });

  const closeCycle = useMutation({
    mutationFn: (id: string) =>
      adminApi<{ id: string; status: string; closedAt: string }>(
        adminPaths.billingCyclesClose(id),
        { method: "POST", body: { confirm: true } },
      ),
    onSuccess: () => {
      toast.success("تم إغلاق دورة الفوترة بنجاح");
      setConfirmOpen(false);
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.billingCycle,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.commissionBreakdown("category"),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const currency = cycle.data?.currency ?? breakdown.data?.currency ?? "EGP";
  const slices: CommissionSlice[] = breakdown.data?.slices ?? [];
  const progressPct = useMemo(() => {
    if (cycle.data?.progressPct != null) return Math.max(0, Math.min(100, cycle.data.progressPct));
    if (!cycle.data?.expectedCents) return 0;
    return Math.round(((cycle.data.collectedCents ?? 0) / cycle.data.expectedCents) * 100);
  }, [cycle.data]);

  if (cycle.isLoading) return <LoadingState label="جار تحميل دورة الفوترة" />;
  if (cycle.isError)
    return <ErrorState message={cycle.error.message} />;

  const data = cycle.data;
  if (!data) return <ErrorState message="لا توجد بيانات لدورة الفوترة." />;

  const periodLabel = data.startsAt && data.endsAt ? formatPeriod(data.startsAt, data.endsAt) : data.label;
  const status = data.status ?? "ACTIVE";

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-brand-teal-600 p-5 text-primary-foreground">
        <div
          aria-hidden
          className="absolute -top-7 -left-7 size-35 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.3),transparent_70%)]"
        />
        <div className="relative z-[2] flex items-center justify-between">
          <div className="text-sm font-bold">الفترة: {periodLabel}</div>
          <StatusBadge status={status === "ACTIVE" ? "ACTIVE" : status} />
        </div>
        <div className="relative z-[2] mt-2 text-[11px] text-[#ccebe6]">
          {data.daysRemaining != null
            ? `تغلق خلال ${data.daysRemaining} يوم`
            : "—"}
        </div>
        <Progress
          value={progressPct}
          className="relative z-[2] mt-2.5 h-2.5 bg-white/20 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-brand-orange [&>[data-slot=progress-indicator]]:to-brand-amber-400"
        />
        <div className="relative z-[2] mt-3 flex items-center justify-between text-[#ccebe6]">
          <div>
            <div className="text-[11px]">المحصل</div>
            <div className="mt-0.5 text-base font-extrabold text-white">
              {formatMoney(data.collectedCents, currency)}
            </div>
          </div>
          <div className="text-left">
            <div className="text-[11px]">المتوقع</div>
            <div className="mt-0.5 text-base font-extrabold text-white">
              {formatMoney(data.expectedCents, currency)}
            </div>
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
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          disabled={status !== "ACTIVE" || closeCycle.isPending}
        >
          {closeCycle.isPending ? "جارٍ الإغلاق..." : "إغلاق دورة الفوترة"}
        </Button>
      </div>

      <ActionDialog
        open={confirmOpen}
        title="إغلاق دورة الفوترة"
        description="سيتم احتساب العمولات وإصدار الفواتير النهائية للبائعين. هذا الإجراء لا يمكن التراجع عنه."
        confirmLabel="إغلاق الدورة"
        variant="default"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => closeCycle.mutate(data.id)}
      />
    </div>
  );
}

function formatPeriod(startsAt: string, endsAt: string) {
  try {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const fmt = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
      day: "numeric",
      month: "long",
    });
    return `${fmt.format(start)} - ${fmt.format(end)}`;
  } catch {
    return "";
  }
}
