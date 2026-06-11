"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { ActionDialog } from "@/components/modals/action-dialog";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/status/status-badge";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  DashboardPayoutSummary,
  PayoutRow,
} from "@/lib/api/types";
import { formatDate, formatMoney } from "@/lib/formatters";

type MarkPaidTarget = PayoutRow | null;

export function PendingPayoutsCard() {
  const [markPaid, setMarkPaid] = useState<MarkPaidTarget>(null);
  const queryClient = useQueryClient();

  const summary = useQuery({
    queryKey: queryKeys.payoutSummary,
    queryFn: () =>
      adminApi<DashboardPayoutSummary>(adminPaths.analyticsPendingPayoutsTotal()),
  });
  const payouts = useQuery({
    queryKey: queryKeys.payouts("PENDING", 5),
    queryFn: () =>
      adminApi<{ data: PayoutRow[]; summary?: DashboardPayoutSummary }>(
        adminPaths.payouts("PENDING", 5),
      ),
    select: (response) => response.data ?? [],
  });

  const markPaidMutation = useMutation({
    mutationFn: (input: { id: string; transactionReference: string; notes?: string }) =>
      adminApi<{ id: string; status: string }>(
        adminPaths.payoutsMarkPaid(input.id),
        {
          method: "POST",
          body: {
            transactionReference: input.transactionReference,
            notes: input.notes,
          },
        },
      ),
    onSuccess: () => {
      toast.success("تم تأكيد صرف المستحقات");
      setMarkPaid(null);
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.pendingPayoutsTotal });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.activityFeed(6) });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const currency = summary.data?.currency ?? payouts.data?.[0]?.currency ?? "EGP";
  const total = summary.data?.pendingTotalCents ?? payouts.data?.reduce((acc, p) => acc + (p.amountCents ?? 0), 0) ?? 0;
  const count = summary.data?.pendingCount ?? payouts.data?.length ?? 0;

  return (
    <SectionCard
      title="مدفوعات معلقة للبائعين"
      description="أقدم 5 مستحقات بحاجة لتأكيد"
      actions={
        <Button asChild variant="ghost" size="sm" className="bg-brand-teal-50 text-primary hover:bg-primary hover:text-primary-foreground">
          <a href="/payouts">عرض الكل ({count})</a>
        </Button>
      }
    >
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-[10px] text-ink-muted">إجمالي المستحقات</div>
          <div className="text-2xl font-extrabold text-ink-strong">
            {summary.isLoading ? "—" : formatMoney(total, currency)}
          </div>
        </div>
        <div className="text-end text-[11px] text-ink-muted">
          {count} بائع
        </div>
      </div>
      {payouts.isLoading ? (
        <LoadingState label="جار التحميل" />
      ) : payouts.isError ? (
        <ErrorState message={payouts.error.message} />
      ) : payouts.data && payouts.data.length > 0 ? (
        <div className="divide-y divide-border-soft">
          {payouts.data.map((row) => (
            <div key={row.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold text-ink-strong">
                  {row.vendorName}
                </div>
                <div className="mt-0.5 text-[11px] text-ink-muted">
                  {row.bankName ? `${row.bankName} • **** ${row.bankAccountLast4 ?? ""}` : row.method}
                  {row.requestedAt ? ` • ${formatDate(row.requestedAt)}` : ""}
                </div>
              </div>
              <div className="text-end">
                <div className="text-[13px] font-extrabold text-primary">
                  {formatMoney(row.amountCents, row.currency)}
                </div>
                <div className="mt-0.5">
                  <StatusBadge status={row.status} />
                </div>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setMarkPaid(row)}
                disabled={row.status !== "PENDING"}
              >
                تأكيد الصرف
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-muted">لا توجد مدفوعات معلقة.</p>
      )}

      <ActionDialog
        open={Boolean(markPaid)}
        title="تأكيد صرف المستحقات"
        description={
          markPaid
            ? `سيتم تأكيد صرف ${formatMoney(markPaid.amountCents, markPaid.currency)} للبائع ${markPaid.vendorName}.`
            : ""
        }
        confirmLabel="تأكيد الصرف"
        variant="success"
        requireReason
        reasonLabel="مرجع التحويل"
        reasonPlaceholder="أدخل رقم مرجع التحويل البنكي أو الملاحظة"
        onCancel={() => setMarkPaid(null)}
        onConfirm={(reason) =>
          markPaid &&
          markPaidMutation.mutate({
            id: markPaid.id,
            transactionReference: reason ?? `tx_${Date.now()}`,
          })
        }
      />
    </SectionCard>
  );
}
