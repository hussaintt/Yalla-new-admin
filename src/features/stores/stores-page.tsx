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
import { StoreLogo } from "@/components/ui/store-logo";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { VendorPage } from "@/lib/api/types";
import { formatDate, localizedText } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const storeStatuses = [
  { label: "قيد المراجعة", value: "PENDING" },
  { label: "معتمد", value: "APPROVED" },
  { label: "موقوف", value: "SUSPENDED" },
  { label: "مرفوض", value: "REJECTED" },
  { label: "مغلق", value: "CLOSED" },
];

type PendingStoreAction = {
  storeId: string;
  storeName: string;
  status: "APPROVED" | "SUSPENDED";
};

export default function StoresPage() {
  const searchParams = useSearchParams();
  const [pendingAction, setPendingAction] = useState<PendingStoreAction | null>(null);
  const queryParams = {
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    limit: "20",
  };
  const queryClient = useQueryClient();

  const stores = useQuery({
    queryKey: queryKeys.vendors(queryParams),
    queryFn: () => adminApi<VendorPage>(adminPaths.vendors(queryParams)),
  });

  const updateStatus = useMutation({
    mutationFn: ({
      storeId,
      status,
      reason,
    }: {
      storeId: string;
      status: "APPROVED" | "REJECTED" | "SUSPENDED";
      reason?: string;
    }) =>
      adminApi(adminPaths.vendorStatus(storeId), {
        method: "PATCH",
        body: { status, reason },
      }),
    onSuccess: async () => {
      toast.success("تم تحديث حالة المتجر");
      await queryClient.invalidateQueries({ queryKey: ["vendors"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.overview(30) });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث المتجر");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="المتاجر"
        description="إدارة المتاجر: الاعتماد والتحقق (KYC)، عدد المنتجات والأعضاء، وبيانات المتجر."
      />

      <TableToolbar
        statusOptions={storeStatuses}
      />

      {stores.isLoading ? (
        <TableSkeleton />
      ) : stores.isError ? (
        <ErrorState message={stores.error.message} />
      ) : (
        <>
          <CursorDataTable
            data={stores.data?.data ?? []}
            getRowKey={(store) => store.publicId}
            columns={[
              {
                id: "store",
                header: "المتجر",
                cell: (store) => (
                  <div className="flex items-center gap-3">
                    <StoreLogo
                      src={store.logoUrl}
                      name={localizedText(store.displayName, store.legalName ?? store.slug ?? "—", "ar")}
                      className="size-10"
                    />
                    <div>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/stores/${store.publicId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {localizedText(store.displayName, store.legalName, "ar")}
                        </Link>
                        <CopyButton value={store.publicId} />
                      </div>
                      <div className="text-xs text-ink-muted">{store.legalName}</div>
                      <div className="text-xs text-ink-muted">{store.email ?? store.slug}</div>
                    </div>
                  </div>
                ),
              },
              {
                id: "status",
                header: "الحالة",
                cell: (store) => <StatusBadge status={store.status} />,
              },
              {
                id: "type",
                header: "النوع",
                cell: (store) => (
                  <div className="text-sm text-ink-strong">
                    <div>{store.storeType ?? "-"}</div>
                    <div>{store.phone ?? "-"}</div>
                  </div>
                ),
              },
              {
                id: "counts",
                header: "الأعداد",
                cell: (store) => (
                  <div className="text-sm text-ink-strong">
                    <div>{store._count?.products ?? 0} منتجات</div>
                    <div>{store._count?.members ?? 0} أعضاء</div>
                  </div>
                ),
              },
              {
                id: "dates",
                header: "التواريخ",
                cell: (store) => (
                  <div className="text-sm text-ink-strong">
                    <div>تم الإنشاء {formatDate(store.createdAt)}</div>
                    <div>تم الاعتماد {formatDate(store.approvedAt)}</div>
                  </div>
                ),
              },
              {
                id: "actions",
                header: "إجراءات",
                cell: (store) => (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={updateStatus.isPending || store.status === "APPROVED"}
                      onClick={() =>
                        setPendingAction({
                          storeId: store.publicId,
                          storeName: store.legalName ?? store.slug ?? store.publicId,
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
                      disabled={updateStatus.isPending || store.status === "SUSPENDED"}
                      onClick={() =>
                        setPendingAction({
                          storeId: store.publicId,
                          storeName: store.legalName ?? store.slug ?? store.publicId,
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
            nextCursor={stores.data?.nextCursor}
            hasMore={stores.data?.hasMore}
          />
        </>
      )}

      <ActionDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.status === "APPROVED" ? "اعتماد المتجر" : "إيقاف المتجر"}
        description={
          pendingAction
            ? `${pendingAction.status === "APPROVED" ? "سيتم اعتماد" : "سيتم إيقاف"} ${pendingAction.storeName}. سيتم تسجيل العملية في لوحة الإدارة.`
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
              storeId: pendingAction.storeId,
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
