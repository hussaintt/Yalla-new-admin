"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { ActionDialog } from "@/components/modals/action-dialog";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { DashboardPayoutSummary, PayoutRow } from "@/lib/api/types";
import { formatDate, formatMoney } from "@/lib/formatters";

const payoutStatuses = [
  { label: "كل الحالات", value: "ALL" },
  { label: "قيد الانتظار", value: "PENDING" },
  { label: "مدفوع", value: "PAID" },
  { label: "فشل", value: "FAILED" },
  { label: "مرفوض", value: "REJECTED" },
];

type PayoutAction =
  | { type: "mark-paid"; payout: PayoutRow }
  | { type: "reject"; payout: PayoutRow }
  | null;

type PayoutsResponse =
  | PayoutRow[]
  | {
      data?: PayoutRow[];
      summary?: DashboardPayoutSummary;
      nextCursor?: string | null;
    };

function rowsFromResponse(response: PayoutsResponse | undefined) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  return response.data ?? [];
}

function summaryFromRows(rows: PayoutRow[], response: PayoutsResponse | undefined) {
  if (response && !Array.isArray(response) && response.summary) {
    return response.summary;
  }

  return {
    pendingCount: rows.filter((row) => row.status === "PENDING").length,
    pendingTotalCents: rows.reduce(
      (total, row) => total + (row.status === "PENDING" ? row.amountCents : 0),
      0,
    ),
    currency: rows[0]?.currency ?? "EGP",
  };
}

function payoutMethod(row: PayoutRow) {
  const bank = row.bankName ? `${row.bankName} / **** ${row.bankAccountLast4 ?? ""}` : undefined;
  return bank ?? row.method ?? "-";
}

export function PayoutsPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<PayoutAction>(null);

  const selectedStatus = searchParams.get("status") ?? "PENDING";
  const status = selectedStatus === "ALL" ? undefined : selectedStatus;
  const limit = 50;

  const payouts = useQuery({
    queryKey: queryKeys.payouts(status, limit),
    queryFn: () =>
      adminApi<PayoutsResponse>(
        adminPaths.payouts(
          status as "PENDING" | "PAID" | "FAILED" | "REJECTED" | undefined,
          limit,
        ),
      ),
  });

  const rows = rowsFromResponse(payouts.data);
  const summary = summaryFromRows(rows, payouts.data);

  const markPaid = useMutation({
    mutationFn: (input: { id: string; transactionReference: string }) =>
      adminApi(adminPaths.payoutsMarkPaid(input.id), {
        method: "POST",
        body: {
          transactionReference: input.transactionReference,
        },
      }),
    onSuccess: async () => {
      toast.success("تم تأكيد صرف المستحقات");
      setPendingAction(null);
      await queryClient.invalidateQueries({ queryKey: ["payouts"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.pendingPayoutsTotal });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تأكيد الصرف");
    },
  });

  const reject = useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      adminApi(adminPaths.payoutsReject(input.id), {
        method: "POST",
        body: { reason: input.reason },
      }),
    onSuccess: async () => {
      toast.success("تم رفض طلب الصرف");
      setPendingAction(null);
      await queryClient.invalidateQueries({ queryKey: ["payouts"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.pendingPayoutsTotal });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر رفض طلب الصرف");
    },
  });

  const actionDisabled = markPaid.isPending || reject.isPending;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SectionCard title="المعلّق" description="عدد طلبات الصرف الحالية">
          <div className="text-3xl font-extrabold text-ink-strong">
            {summary.pendingCount}
          </div>
        </SectionCard>
        <SectionCard title="إجمالي المستحقات" description="طلبات قيد الانتظار">
          <div className="text-3xl font-extrabold text-primary">
            {formatMoney(summary.pendingTotalCents, summary.currency)}
          </div>
        </SectionCard>
        <SectionCard title="نطاق العرض" description="آخر السجلات حسب الفلتر">
          <div className="text-3xl font-extrabold text-ink-strong">{limit}</div>
        </SectionCard>
      </section>

      <TableToolbar
        searchPlaceholder="ابحث داخل الصفحة الحالية من المتصفح"
        statusOptions={payoutStatuses}
      />

      {payouts.isLoading ? (
        <LoadingState label="جار تحميل المستحقات" />
      ) : payouts.isError ? (
        <ErrorState message={payouts.error.message} />
      ) : (
        <CursorDataTable
          data={rows}
          getRowKey={(row) => row.id}
          emptyLabel="لا توجد مستحقات بهذا الفلتر."
          columns={[
            {
              id: "vendor",
              header: "البائع",
              cell: (row) => (
                <div>
                  <div className="font-bold text-ink-strong">{row.vendorName}</div>
                  <div className="text-xs text-ink-muted">{row.vendorId}</div>
                </div>
              ),
            },
            {
              id: "amount",
              header: "المبلغ",
              cell: (row) => (
                <span className="font-extrabold text-primary">
                  {formatMoney(row.amountCents, row.currency)}
                </span>
              ),
            },
            {
              id: "method",
              header: "طريقة الصرف",
              cell: (row) => payoutMethod(row),
            },
            {
              id: "requestedAt",
              header: "تاريخ الطلب",
              cell: (row) => (row.requestedAt ? formatDate(row.requestedAt) : "-"),
            },
            {
              id: "status",
              header: "الحالة",
              cell: (row) => <StatusBadge status={row.status} />,
            },
            {
              id: "actions",
              header: "الإجراء",
              cell: (row) =>
                row.status === "PENDING" ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-success"
                      onClick={() => setPendingAction({ type: "mark-paid", payout: row })}
                    >
                      تأكيد الصرف
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-danger"
                      onClick={() => setPendingAction({ type: "reject", payout: row })}
                    >
                      رفض
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-ink-muted">لا يوجد إجراء</span>
                ),
            },
          ]}
        />
      )}

      <ActionDialog
        open={pendingAction?.type === "mark-paid"}
        title="تأكيد صرف المستحقات"
        description={
          pendingAction?.type === "mark-paid"
            ? `سيتم تأكيد صرف ${formatMoney(pendingAction.payout.amountCents, pendingAction.payout.currency)} للبائع ${pendingAction.payout.vendorName}.`
            : ""
        }
        confirmLabel="تأكيد الصرف"
        variant="success"
        requireReason
        reasonLabel="مرجع التحويل"
        reasonPlaceholder="أدخل رقم مرجع التحويل البنكي أو الملاحظة"
        disabled={actionDisabled}
        onCancel={() => setPendingAction(null)}
        onConfirm={(transactionReference) => {
          if (pendingAction?.type === "mark-paid" && transactionReference) {
            markPaid.mutate({ id: pendingAction.payout.id, transactionReference });
          }
        }}
      />

      <ActionDialog
        open={pendingAction?.type === "reject"}
        title="رفض طلب الصرف"
        description={
          pendingAction?.type === "reject"
            ? `سيتم رفض طلب صرف ${formatMoney(pendingAction.payout.amountCents, pendingAction.payout.currency)} للبائع ${pendingAction.payout.vendorName}.`
            : ""
        }
        confirmLabel="رفض الطلب"
        variant="danger"
        requireReason
        reasonLabel="سبب الرفض"
        reasonPlaceholder="اكتب سبب الرفض ليظهر في سجل التدقيق"
        disabled={actionDisabled}
        onCancel={() => setPendingAction(null)}
        onConfirm={(reason) => {
          if (pendingAction?.type === "reject" && reason) {
            reject.mutate({ id: pendingAction.payout.id, reason });
          }
        }}
      />
    </div>
  );
}
