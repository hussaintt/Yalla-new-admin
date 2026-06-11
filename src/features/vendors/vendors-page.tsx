"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { CursorPager } from "@/components/data-table/cursor-pager";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { ActionDialog } from "@/components/modals/action-dialog";
import { TableSkeleton } from "@/components/state/table-skeleton";
import { ErrorState } from "@/components/state/async-states";
import { StatusBadge } from "@/components/status/status-badge";
import { adminApi } from "@/lib/api/admin-client";
import { CopyButton } from "@/components/ui/copy-button";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { VendorPage } from "@/lib/api/types";
import { formatDate, localizedText } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const vendorStatuses = [
  { label: "قيد المراجعة", value: "PENDING" },
  { label: "معتمد", value: "APPROVED" },
  { label: "موقوف", value: "SUSPENDED" },
  { label: "مرفوض", value: "REJECTED" },
  { label: "مغلق", value: "CLOSED" },
];

type PendingVendorAction = {
  vendorId: string;
  vendorName: string;
  status: "APPROVED" | "SUSPENDED";
};

export default function VendorsPage() {
  const searchParams = useSearchParams();
  const [pendingAction, setPendingAction] = useState<PendingVendorAction | null>(null);
  const queryParams = {
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    limit: "20",
  };
  const queryClient = useQueryClient();

  const vendors = useQuery({
    queryKey: queryKeys.vendors(queryParams),
    queryFn: () => adminApi<VendorPage>(adminPaths.vendors(queryParams)),
  });

  const updateStatus = useMutation({
    mutationFn: ({
      vendorId,
      status,
      reason,
    }: {
      vendorId: string;
      status: "APPROVED" | "REJECTED" | "SUSPENDED";
      reason?: string;
    }) =>
      adminApi(adminPaths.vendorStatus(vendorId), {
        method: "PATCH",
        body: { status, reason },
      }),
    onSuccess: async () => {
      toast.success("تم تحديث حالة البائع");
      await queryClient.invalidateQueries({ queryKey: ["vendors"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.overview(30) });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث البائع");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="البائعون"
        description="مراجعة حالة البائعين، عدد المنتجات والأعضاء، الاعتمادات، وبيانات المتجر."
      />

      <TableToolbar
        statusOptions={vendorStatuses}
      />

      {vendors.isLoading ? (
        <TableSkeleton />
      ) : vendors.isError ? (
        <ErrorState message={vendors.error.message} />
      ) : (
        <>
          <CursorDataTable
            data={vendors.data?.data ?? []}
            getRowKey={(vendor) => vendor.publicId}
            columns={[
              {
                id: "vendor",
                header: "البائع",
                cell: (vendor) => (
                  <div>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/vendors/${vendor.publicId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {localizedText(vendor.displayName, vendor.legalName, "ar")}
                      </Link>
                      <CopyButton value={vendor.publicId} />
                    </div>
                    <div className="text-xs text-ink-muted">{vendor.legalName}</div>
                    <div className="text-xs text-ink-muted">{vendor.email ?? vendor.slug}</div>
                  </div>
                ),
              },
              {
                id: "status",
                header: "الحالة",
                cell: (vendor) => <StatusBadge status={vendor.status} />,
              },
              {
                id: "type",
                header: "النوع",
                cell: (vendor) => (
                  <div className="text-sm text-ink-strong">
                    <div>{vendor.storeType ?? "-"}</div>
                    <div>{vendor.phone ?? "-"}</div>
                  </div>
                ),
              },
              {
                id: "counts",
                header: "الأعداد",
                cell: (vendor) => (
                  <div className="text-sm text-ink-strong">
                    <div>{vendor._count?.products ?? 0} منتجات</div>
                    <div>{vendor._count?.members ?? 0} أعضاء</div>
                  </div>
                ),
              },
              {
                id: "dates",
                header: "التواريخ",
                cell: (vendor) => (
                  <div className="text-sm text-ink-strong">
                    <div>تم الإنشاء {formatDate(vendor.createdAt)}</div>
                    <div>تم الاعتماد {formatDate(vendor.approvedAt)}</div>
                  </div>
                ),
              },
              {
                id: "actions",
                header: "إجراءات",
                cell: (vendor) => (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={updateStatus.isPending || vendor.status === "APPROVED"}
                      onClick={() =>
                        setPendingAction({
                          vendorId: vendor.publicId,
                          vendorName: vendor.legalName ?? vendor.slug ?? vendor.publicId,
                          status: "APPROVED",
                        })
                      }
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
                        "border-success/30 text-success hover:bg-success-soft",
                      )}
                    >
                      اعتماد
                    </button>
                    <button
                      type="button"
                      disabled={updateStatus.isPending || vendor.status === "SUSPENDED"}
                      onClick={() =>
                        setPendingAction({
                          vendorId: vendor.publicId,
                          vendorName: vendor.legalName ?? vendor.slug ?? vendor.publicId,
                          status: "SUSPENDED",
                        })
                      }
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
                        "border-destructive/30 text-destructive hover:bg-destructive-soft",
                      )}
                    >
                      إيقاف
                    </button>
                  </div>
                ),
              },
            ]}
          />
          <CursorPager
            nextCursor={vendors.data?.nextCursor}
            hasMore={vendors.data?.hasMore}
          />
        </>
      )}

      <ActionDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.status === "APPROVED" ? "اعتماد البائع" : "إيقاف البائع"}
        description={
          pendingAction
            ? `${pendingAction.status === "APPROVED" ? "سيتم اعتماد" : "سيتم إيقاف"} ${pendingAction.vendorName}. سيتم تسجيل العملية في لوحة الإدارة.`
            : ""
        }
        confirmLabel={pendingAction?.status === "APPROVED" ? "اعتماد" : "إيقاف"}
        variant={pendingAction?.status === "APPROVED" ? "success" : "danger"}
        requireReason={pendingAction?.status === "SUSPENDED"}
        reasonLabel="سبب الإيقاف"
        reasonPlaceholder="اكتب سبب الإيقاف ليظهر في سجل التدقيق"
        disabled={updateStatus.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={(reason) => {
          if (!pendingAction) return;
          updateStatus.mutate(
            {
              vendorId: pendingAction.vendorId,
              status: pendingAction.status,
              reason,
            },
            { onSettled: () => setPendingAction(null) },
          );
        }}
      />
    </div>
  );
}
