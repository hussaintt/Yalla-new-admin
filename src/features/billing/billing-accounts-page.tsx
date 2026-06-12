"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { CursorPager } from "@/components/data-table/cursor-pager";
import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/state/table-skeleton";
import { EmptyState, ErrorState } from "@/components/state/async-states";
import { StatusBadge } from "@/components/status/status-badge";
import { adminApi } from "@/lib/api/admin-client";
import { withQuery } from "@/lib/api/paths";
import { formatDate, formatMoney } from "@/lib/formatters";

type AnyRecord = Record<string, unknown>;

function text(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function BillingAccountsPage() {
  const searchParams = useSearchParams();
  const params = {
    cursor: searchParams.get("cursor") ?? undefined,
    limit: "20",
  };

  const accounts = useQuery({
    queryKey: ["billing", "accounts", params],
    queryFn: () =>
      adminApi<AnyRecord>(
        withQuery("/api/admin/admin/vendor-billing/accounts", params),
      ),
  });

  const data: AnyRecord[] = (() => {
    const raw = accounts.data;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object" && Array.isArray((raw as AnyRecord).data)) {
      return (raw as AnyRecord).data as AnyRecord[];
    }
    return [];
  })();
  const page = accounts.data as AnyRecord | undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="حسابات فوترة البائعين"
        description="جميع حسابات البائعين المسجلة في نظام الفوترة مع أرصدتهم الحالية."
        actions={
          <Link
            href="/billing"
            className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted"
          >
            الفوترة الرئيسية
          </Link>
        }
      />

      {accounts.isLoading ? (
        <TableSkeleton />
      ) : accounts.isError ? (
        <ErrorState message={accounts.error.message} />
      ) : data.length === 0 ? (
        <EmptyState title="لا توجد حسابات فوترة" description="لم يتم تسجيل حسابات فوترة حتى الآن." />
      ) : (
        <>
          <CursorDataTable
            data={data}
            getRowKey={(row) => String(row.publicId ?? row.id ?? row.vendorId)}
            columns={[
              {
                id: "vendor",
                header: "البائع",
                cell: (row) => {
                  const vendor = row.vendor as AnyRecord | undefined;
                  const vendorId = String(row.vendorPublicId ?? row.vendorId ?? "");
                  return (
                    <div>
                      <Link
                        href={`/vendors/${vendorId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {text(vendor?.email ?? vendor?.displayName ?? row.vendorName ?? vendorId)}
                      </Link>
                      {vendor?.legalName ? (
                        <div className="text-xs text-ink-muted">{String(vendor.legalName)}</div>
                      ) : null}
                    </div>
                  );
                },
              },
              {
                id: "balance",
                header: "الرصيد",
                cell: (row) => formatMoney(row.balanceCents ?? row.balance, String(row.currency ?? "EGP")),
              },
              {
                id: "pendingPayout",
                header: "بانتظار السحب",
                cell: (row) => formatMoney(row.pendingPayoutCents ?? 0, String(row.currency ?? "EGP")),
              },
              {
                id: "totalEarned",
                header: "إجمالي الأرباح",
                cell: (row) => formatMoney(row.totalEarnedCents ?? row.totalEarned ?? 0, String(row.currency ?? "EGP")),
              },
              {
                id: "restricted",
                header: "محظور؟",
                cell: (row) => (
                  <StatusBadge status={row.restricted || row.isRestricted ? "RESTRICTED" : "ACTIVE"} />
                ),
              },
              {
                id: "updated",
                header: "آخر تحديث",
                cell: (row) => formatDate(row.updatedAt ?? row.createdAt),
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
