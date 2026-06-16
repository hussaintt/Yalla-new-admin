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
import { Button } from "@/components/ui/button";
import { adminApi } from "@/lib/api/admin-client";
import { withQuery } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { ResolutionPage } from "@/lib/api/types";
import { formatDate, formatName, localizedText } from "@/lib/formatters";

const resolutionStatuses = [
  { label: "مفتوحة", value: "OPEN" },
  { label: "قيد المراجعة", value: "UNDER_REVIEW" },
  { label: "تمت الموافقة", value: "APPROVED" },
  { label: "مرفوضة", value: "REJECTED" },
  { label: "بانتظار الإرجاع", value: "AWAITING_RETURN" },
  { label: "تم الاستلام", value: "RECEIVED" },
  { label: "تم الحل", value: "RESOLVED" },
  { label: "مغلقة", value: "CLOSED" },
];

type ResolveStatus = "RESOLVED" | "REJECTED" | "CLOSED";

type PendingAction = {
  publicId: string;
  status: ResolveStatus;
  label: string;
};

const actionTitles: Record<ResolveStatus, string> = {
  RESOLVED: "حل الحالة",
  REJECTED: "رفض الحالة",
  CLOSED: "إغلاق الحالة",
};

export default function ResolutionsPage() {
  const searchParams = useSearchParams();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const queryParams = {
    status: searchParams.get("status") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    limit: "20",
  };
  const queryClient = useQueryClient();

  const resolutions = useQuery({
    queryKey: queryKeys.resolutions(queryParams),
    queryFn: () =>
      adminApi<ResolutionPage>(withQuery("/api/admin/admin/resolutions", queryParams)),
  });

  const updateCase = useMutation({
    mutationFn: ({
      publicId,
      status,
      note,
    }: {
      publicId: string;
      status: ResolveStatus;
      note?: string;
    }) =>
      adminApi(`/api/admin/admin/resolutions/${publicId}`, {
        method: "PATCH",
        body: { status, note },
      }),
    onSuccess: async () => {
      toast.success("تم تحديث الحالة");
      await queryClient.invalidateQueries({ queryKey: ["resolutions"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الحالة");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="الإرجاع والنزاعات"
        description="راجع طلبات إرجاع المنتجات وشكاوى العملاء، وأصدر القرار النهائي. الاسترداد يتم من شاشة الاستردادات."
      />

      <TableToolbar statusOptions={resolutionStatuses} />

      {resolutions.isLoading ? (
        <TableSkeleton />
      ) : resolutions.isError ? (
        <ErrorState message={resolutions.error.message} />
      ) : (
        <>
          <CursorDataTable
            data={resolutions.data?.data ?? []}
            getRowKey={(item) => item.publicId}
            columns={[
              {
                id: "case",
                header: "الحالة",
                cell: (item) => (
                  <div className="max-w-md">
                    <div className="font-medium text-ink-strong">
                      {item.type === "RETURN" ? "إرجاع" : "نزاع"} · {item.caseNumber}
                    </div>
                    <div className="mt-1 text-xs text-ink-muted">{item.reasonCode}</div>
                    {item.description ? (
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-muted">
                        {item.description}
                      </p>
                    ) : null}
                    {item.returnTrackingNumber ? (
                      <div className="mt-1 text-xs text-ink-muted">
                        تتبع: {item.returnTrackingNumber}
                      </div>
                    ) : null}
                  </div>
                ),
              },
              {
                id: "status",
                header: "الحالة الحالية",
                cell: (item) => <StatusBadge status={item.status} />,
              },
              {
                id: "context",
                header: "السياق",
                cell: (item) => (
                  <div className="text-sm text-ink-strong">
                    <div>
                      الطلب:{" "}
                      {item.order?.publicId ? (
                        <Link
                          href={`/orders/${item.order.publicId}`}
                          className="text-primary hover:underline"
                        >
                          {item.order.orderNumber ?? item.order.publicId}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </div>
                    <div>
                      البائع:{" "}
                      {item.vendor?.publicId ? (
                        <Link
                          href={`/stores/${item.vendor.publicId}`}
                          className="text-primary hover:underline"
                        >
                          {localizedText(item.vendor.displayName, item.vendor.publicId, "ar")}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </div>
                    <div>
                      المشتري:{" "}
                      {item.user
                        ? formatName({
                            firstName: item.user.firstName,
                            lastName: item.user.lastName,
                          })
                        : "-"}
                    </div>
                    <div className="mt-1 text-xs text-ink-muted">
                      أُنشئت {formatDate(item.createdAt)}
                    </div>
                  </div>
                ),
              },
              {
                id: "actions",
                header: "إجراءات",
                cell: (item) => {
                  const terminal = ["RESOLVED", "REJECTED", "CLOSED"].includes(item.status);
                  return (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline-success"
                        disabled={updateCase.isPending || terminal}
                        onClick={() =>
                          setPendingAction({
                            publicId: item.publicId,
                            status: "RESOLVED",
                            label: item.caseNumber,
                          })
                        }
                      >
                        حل
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline-danger"
                        disabled={updateCase.isPending || terminal}
                        onClick={() =>
                          setPendingAction({
                            publicId: item.publicId,
                            status: "REJECTED",
                            label: item.caseNumber,
                          })
                        }
                      >
                        رفض
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={updateCase.isPending || terminal}
                        onClick={() =>
                          setPendingAction({
                            publicId: item.publicId,
                            status: "CLOSED",
                            label: item.caseNumber,
                          })
                        }
                      >
                        إغلاق
                      </Button>
                    </div>
                  );
                },
              },
            ]}
          />
          <CursorPager
            nextCursor={resolutions.data?.nextCursor}
            hasMore={resolutions.data?.hasMore}
          />
        </>
      )}

      <ActionDialog
        open={Boolean(pendingAction)}
        title={pendingAction ? actionTitles[pendingAction.status] : ""}
        description={
          pendingAction ? `الحالة: ${pendingAction.label}` : ""
        }
        confirmLabel="تأكيد"
        variant={pendingAction?.status === "RESOLVED" ? "success" : "danger"}
        requireReason={pendingAction?.status !== "RESOLVED"}
        disabled={updateCase.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={(reason) => {
          if (!pendingAction) return;
          updateCase.mutate(
            {
              publicId: pendingAction.publicId,
              status: pendingAction.status,
              note: reason,
            },
            { onSettled: () => setPendingAction(null) },
          );
        }}
      />
    </div>
  );
}
