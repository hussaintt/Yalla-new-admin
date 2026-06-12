"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { CursorPager } from "@/components/data-table/cursor-pager";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/state/table-skeleton";
import { EmptyState, ErrorState } from "@/components/state/async-states";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { adminApi } from "@/lib/api/admin-client";
import { withQuery } from "@/lib/api/paths";
import { formatDate, formatMoney } from "@/lib/formatters";

type AnyRecord = Record<string, unknown>;

const paymentStatuses = [
  { label: "بانتظار المراجعة", value: "PENDING" },
  { label: "ناجحة", value: "SUCCEEDED" },
  { label: "فاشلة", value: "FAILED" },
  { label: "مرفوضة", value: "REJECTED" },
];

function text(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function BillingPaymentsPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const params = {
    status: searchParams.get("status") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    limit: "20",
  };

  const payments = useQuery({
    queryKey: ["billing", "payments", params],
    queryFn: () =>
      adminApi<AnyRecord>(
        withQuery("/api/admin/admin/vendor-billing/payments", params),
      ),
  });

  const reviewPayment = useMutation({
    mutationFn: ({ paymentId, status }: { paymentId: string; status: string }) =>
      adminApi(`/api/admin/admin/vendor-billing/payments/${paymentId}/review`, {
        method: "PATCH",
        body: { status },
      }),
    onSuccess: async () => {
      toast.success("تم تحديث حالة المدفوعة");
      await queryClient.invalidateQueries({ queryKey: ["billing", "payments"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر تحديث المدفوعة"),
  });

  const data: AnyRecord[] = (() => {
    const raw = payments.data;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object" && Array.isArray((raw as AnyRecord).data)) {
      return (raw as AnyRecord).data as AnyRecord[];
    }
    return [];
  })();
  const page = payments.data as AnyRecord | undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدفوعات فوترة البائعين"
        description="جميع المدفوعات الصادرة والمعلّقة مع إمكانية المراجعة والتأكيد."
        actions={
          <Link
            href="/billing"
            className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted"
          >
            الفوترة الرئيسية
          </Link>
        }
      />

      <TableToolbar statusOptions={paymentStatuses} />

      {payments.isLoading ? (
        <TableSkeleton />
      ) : payments.isError ? (
        <ErrorState message={payments.error.message} />
      ) : data.length === 0 ? (
        <EmptyState title="لا توجد مدفوعات" description="لم يتم تسجيل مدفوعات فوترة حتى الآن." />
      ) : (
        <>
          <CursorDataTable
            data={data}
            getRowKey={(row) => String(row.publicId ?? row.id)}
            columns={[
              {
                id: "id",
                header: "معرف المدفوعة",
                cell: (row) => (
                  <span className="font-mono text-xs font-semibold text-ink-strong">
                    {text(row.publicId ?? row.id)}
                  </span>
                ),
              },
              {
                id: "vendor",
                header: "البائع",
                cell: (row) => {
                  const vendor = row.vendor as AnyRecord | undefined;
                  return text(vendor?.email ?? vendor?.displayName ?? row.vendorId);
                },
              },
              {
                id: "amount",
                header: "المبلغ",
                cell: (row) => formatMoney(row.amountCents, String(row.currency ?? "EGP")),
              },
              {
                id: "status",
                header: "الحالة",
                cell: (row) => <StatusBadge status={text(row.status, "UNKNOWN")} />,
              },
              {
                id: "method",
                header: "طريقة الدفع",
                cell: (row) => text(row.method ?? row.paymentMethod),
              },
              {
                id: "date",
                header: "التاريخ",
                cell: (row) => formatDate(row.createdAt),
              },
              {
                id: "actions",
                header: "إجراءات",
                cell: (row) => {
                  const status = String(row.status ?? "");
                  if (status !== "PENDING") return null;
                  return (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={reviewPayment.isPending}
                        onClick={() =>
                          reviewPayment.mutate({
                            paymentId: String(row.publicId ?? row.id),
                            status: "SUCCEEDED",
                          })
                        }
                        className="border-success/30 text-success"
                      >
                        تأكيد
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={reviewPayment.isPending}
                        onClick={() =>
                          reviewPayment.mutate({
                            paymentId: String(row.publicId ?? row.id),
                            status: "REJECTED",
                          })
                        }
                        className="border-destructive/30 text-destructive"
                      >
                        رفض
                      </Button>
                    </div>
                  );
                },
              },
            ]}
          />
          <CursorPager
            nextCursor={page?.nextCursor as string | undefined}
            hasMore={page?.hasMore as boolean | undefined}
          />
        </>
      )}
    </div>
  );
}
