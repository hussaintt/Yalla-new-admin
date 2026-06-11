"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { adminApi } from "@/lib/api/admin-client";
import { withQuery } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { UserPage } from "@/lib/api/types";
import { formatDate, formatName } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const userStatuses = [
  { label: "قيد الانتظار", value: "PENDING" },
  { label: "نشط", value: "ACTIVE" },
  { label: "موقوف", value: "SUSPENDED" },
  { label: "محذوف", value: "DELETED" },
];

type PendingUserAction = {
  userId: string;
  userLabel: string;
  status: "ACTIVE" | "SUSPENDED";
};

export default function VendorsPage() {
  const searchParams = useSearchParams();
  const [pendingAction, setPendingAction] = useState<PendingUserAction | null>(null);
  const queryParams = {
    type: "seller",
    status: searchParams.get("status") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    limit: "20",
  };
  const queryClient = useQueryClient();

  const sellers = useQuery({
    queryKey: queryKeys.users(queryParams),
    queryFn: () =>
      adminApi<UserPage>(withQuery("/api/admin/admin/users", queryParams)),
  });

  const updateStatus = useMutation({
    mutationFn: ({
      userId,
      status,
      reason,
    }: {
      userId: string;
      status: string;
      reason?: string;
    }) =>
      adminApi(`/api/admin/admin/users/${userId}/status`, {
        method: "PATCH",
        body: { status, reason },
      }),
    onSuccess: async () => {
      toast.success("تم تحديث حالة البائع");
      await queryClient.invalidateQueries({ queryKey: ["users"] });
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
        description="حسابات البائعين (الأشخاص) المسجلين بالمنصة وإيقاف أو إعادة تنشيط الحسابات. لإدارة المتاجر نفسها انتقل إلى صفحة المتاجر."
      />

      <TableToolbar
        statusOptions={userStatuses}
      />

      {sellers.isLoading ? (
        <TableSkeleton />
      ) : sellers.isError ? (
        <ErrorState message={sellers.error.message} />
      ) : (
        <>
          <CursorDataTable
            data={sellers.data?.data ?? []}
            getRowKey={(user) => user.publicId}
            columns={[
              {
                id: "seller",
                header: "البائع",
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
              {
                id: "actions",
                header: "إجراءات",
                cell: (user) => {
                  const nextStatus =
                    user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
                  return (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={updateStatus.isPending}
                      onClick={() =>
                        setPendingAction({
                          userId: user.publicId,
                          userLabel: user.email ?? user.publicId,
                          status: nextStatus,
                        })
                      }
                      className={cn(
                        nextStatus === "SUSPENDED"
                          ? "border-destructive/30 text-destructive hover:bg-destructive-soft"
                          : "border-success/30 text-success hover:bg-success-soft",
                      )}
                    >
                      {nextStatus === "SUSPENDED" ? "إيقاف" : "إعادة تنشيط"}
                    </Button>
                  );
                },
              },
            ]}
          />
          <CursorPager
            nextCursor={sellers.data?.nextCursor}
            hasMore={sellers.data?.hasMore}
          />
        </>
      )}

      <ActionDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.status === "SUSPENDED" ? "إيقاف البائع" : "إعادة تنشيط البائع"}
        description={
          pendingAction
            ? `${pendingAction.status === "SUSPENDED" ? "سيتم إيقاف" : "سيتم إعادة تنشيط"} ${pendingAction.userLabel}.`
            : ""
        }
        confirmLabel={pendingAction?.status === "SUSPENDED" ? "إيقاف" : "إعادة تنشيط"}
        variant={pendingAction?.status === "SUSPENDED" ? "danger" : "success"}
        requireReason={pendingAction?.status === "SUSPENDED"}
        disabled={updateStatus.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (!pendingAction) return;
          updateStatus.mutate(
            { userId: pendingAction.userId, status: pendingAction.status },
            { onSettled: () => setPendingAction(null) },
          );
        }}
      />
    </div>
  );
}
