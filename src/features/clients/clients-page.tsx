"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { CursorPager } from "@/components/data-table/cursor-pager";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/state/table-skeleton";
import { ErrorState } from "@/components/state/async-states";
import { StatusBadge } from "@/components/status/status-badge";
import { CopyButton } from "@/components/ui/copy-button";
import { adminApi } from "@/lib/api/admin-client";
import { withQuery } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { UserPage } from "@/lib/api/types";
import { formatDate, formatName } from "@/lib/formatters";

const userStatuses = [
  { label: "قيد الانتظار", value: "PENDING" },
  { label: "نشط", value: "ACTIVE" },
  { label: "موقوف", value: "SUSPENDED" },
  { label: "محذوف", value: "DELETED" },
];

export default function ClientsPage() {
  const searchParams = useSearchParams();
  const queryParams = {
    type: "customer",
    status: searchParams.get("status") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    limit: "20",
  };

  const customers = useQuery({
    queryKey: queryKeys.users(queryParams),
    queryFn: () =>
      adminApi<UserPage>(withQuery("/api/admin/admin/users", queryParams)),
  });

  const total = customers.data?.total;
  const description =
    typeof total === "number"
      ? `عرض حسابات العملاء المسجلين بالمنصة. إجمالي العملاء: ${new Intl.NumberFormat("ar-EG-u-nu-latn").format(total)}.`
      : "عرض حسابات العملاء المسجلين بالمنصة (للاطلاع فقط).";

  return (
    <div className="space-y-6">
      <PageHeader title="العملاء" description={description} />

      <TableToolbar statusOptions={userStatuses} />

      {customers.isLoading ? (
        <TableSkeleton />
      ) : customers.isError ? (
        <ErrorState message={customers.error.message} />
      ) : (
        <>
          <CursorDataTable
            data={customers.data?.data ?? []}
            getRowKey={(user) => user.publicId}
            columns={[
              {
                id: "client",
                header: "العميل",
                cell: (user) => (
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-ink-strong">
                        {formatName(user)}
                      </span>
                      <CopyButton value={user.publicId} />
                    </div>
                    <div className="text-xs text-ink-muted">{user.email}</div>
                    <div className="text-xs text-ink-muted">{user.phone ?? "-"}</div>
                  </div>
                ),
              },
              {
                id: "status",
                header: "الحالة",
                cell: (user) => <StatusBadge status={user.status} />,
              },
              {
                id: "activity",
                header: "النشاط",
                cell: (user) => (
                  <div className="text-sm text-ink-strong">
                    <div>تم الإنشاء {formatDate(user.createdAt)}</div>
                    <div>آخر دخول {formatDate(user.lastLoginAt)}</div>
                  </div>
                ),
              },
            ]}
          />
          <CursorPager
            nextCursor={customers.data?.nextCursor}
            hasMore={customers.data?.hasMore}
          />
        </>
      )}
    </div>
  );
}
