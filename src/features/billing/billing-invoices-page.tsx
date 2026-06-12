"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { CursorPager } from "@/components/data-table/cursor-pager";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/state/table-skeleton";
import { EmptyState, ErrorState } from "@/components/state/async-states";
import { StatusBadge } from "@/components/status/status-badge";
import { adminApi } from "@/lib/api/admin-client";
import { withQuery } from "@/lib/api/paths";
import { formatDate, formatMoney } from "@/lib/formatters";

type AnyRecord = Record<string, unknown>;

const invoiceStatuses = [
  { label: "مفتوحة", value: "OPEN" },
  { label: "مدفوعة", value: "PAID" },
  { label: "متأخرة", value: "OVERDUE" },
  { label: "ملغاة", value: "VOID" },
];

function text(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function BillingInvoicesPage() {
  const searchParams = useSearchParams();
  const params = {
    status: searchParams.get("status") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    limit: "20",
  };

  const invoices = useQuery({
    queryKey: ["billing", "invoices", params],
    queryFn: () =>
      adminApi<AnyRecord>(
        withQuery("/api/admin/admin/vendor-billing/invoices", params),
      ),
  });

  const data: AnyRecord[] = (() => {
    const raw = invoices.data;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object" && Array.isArray((raw as AnyRecord).data)) {
      return (raw as AnyRecord).data as AnyRecord[];
    }
    return [];
  })();
  const page = invoices.data as AnyRecord | undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="فواتير البائعين"
        description="جميع فواتير الفوترة المولّدة للبائعين مع إمكانية التصفية حسب الحالة."
        actions={
          <Link
            href="/billing"
            className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted"
          >
            الفوترة الرئيسية
          </Link>
        }
      />

      <TableToolbar statusOptions={invoiceStatuses} />

      {invoices.isLoading ? (
        <TableSkeleton />
      ) : invoices.isError ? (
        <ErrorState message={invoices.error.message} />
      ) : data.length === 0 ? (
        <EmptyState title="لا توجد فواتير" description="لم يتم إنشاء فواتير حتى الآن." />
      ) : (
        <>
          <CursorDataTable
            data={data}
            getRowKey={(row) => String(row.publicId ?? row.id)}
            columns={[
              {
                id: "id",
                header: "رقم الفاتورة",
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
                cell: (row) => formatMoney(row.totalCents ?? row.amountCents, String(row.currency ?? "EGP")),
              },
              {
                id: "status",
                header: "الحالة",
                cell: (row) => <StatusBadge status={text(row.status, "UNKNOWN")} />,
              },
              {
                id: "period",
                header: "الفترة",
                cell: (row) => (
                  <div className="text-sm text-ink-strong">
                    <div>{formatDate(row.periodStart ?? row.startDate)}</div>
                    <div className="text-xs text-ink-muted">إلى {formatDate(row.periodEnd ?? row.endDate)}</div>
                  </div>
                ),
              },
              {
                id: "created",
                header: "تاريخ الإنشاء",
                cell: (row) => formatDate(row.createdAt),
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
