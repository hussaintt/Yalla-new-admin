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
import type { ReviewPage } from "@/lib/api/types";
import { formatDate, formatName, localizedText } from "@/lib/formatters";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

const reviewStatuses = [
  { label: "قيد المراجعة", value: "PENDING" },
  { label: "معتمد", value: "APPROVED" },
  { label: "مرفوض", value: "REJECTED" },
];

type PendingReviewAction = {
  reviewId: string;
  status: "APPROVED" | "REJECTED";
  label: string;
};

export default function ReviewsPage() {
  const searchParams = useSearchParams();
  const { confirm, element: confirmElement } = useConfirmDialog();
  const [pendingAction, setPendingAction] = useState<PendingReviewAction | null>(null);
  const queryParams = {
    status: searchParams.get("status") ?? "PENDING",
    cursor: searchParams.get("cursor") ?? undefined,
    limit: "20",
  };
  const queryClient = useQueryClient();

  const reviews = useQuery({
    queryKey: queryKeys.reviews(queryParams),
    queryFn: () =>
      adminApi<ReviewPage>(withQuery("/api/admin/admin/reviews", queryParams)),
  });

  const deleteReview = useMutation({
    mutationFn: (reviewId: string) =>
      adminApi(`/api/admin/admin/reviews/${reviewId}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      toast.success("تم حذف المراجعة");
      await queryClient.invalidateQueries({ queryKey: ["reviews"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.overview(30) });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "تعذر حذف المراجعة"
      );
    },
  });

  const moderateReview = useMutation({
    mutationFn: ({
      reviewId,
      status,
      reason,
    }: {
      reviewId: string;
      status: "APPROVED" | "REJECTED";
      reason?: string;
    }) =>
      adminApi(`/api/admin/admin/reviews/${reviewId}/moderate`, {
        method: "POST",
        body: { status, reason },
      }),
    onSuccess: async () => {
      toast.success("تم تحديث حالة المراجعة");
      await queryClient.invalidateQueries({ queryKey: ["reviews"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.overview(30) });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "تعذر تحديث المراجعة",
      );
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="المراجعات"
        description="مراجعة تقييمات المنتجات والبائعين قبل أن تؤثر على جودة السوق."
      />

      <TableToolbar statusOptions={reviewStatuses} />

      {reviews.isLoading ? (
        <TableSkeleton />
      ) : reviews.isError ? (
        <ErrorState message={reviews.error.message} />
      ) : (
        <>
          <CursorDataTable
            data={reviews.data?.data ?? []}
            getRowKey={(review) => review.publicId}
            columns={[
              {
                id: "review",
                header: "المراجعة",
                cell: (review) => (
                  <div className="max-w-md">
                    <Link href={`/reviews/${review.publicId}`} className="font-medium text-primary hover:underline">
                      {review.title ?? "مراجعة بدون عنوان"}
                    </Link>
                    <p className="mt-1 line-clamp-3 text-sm leading-6 text-ink-muted">
                      {review.body ?? "-"}
                    </p>
                    <div className="mt-1 text-xs text-ink-muted">
                      {review.rating}/5 نجوم · مفيدة {review.helpfulCount ?? 0}
                    </div>
                  </div>
                ),
              },
              {
                id: "status",
                header: "الحالة",
                cell: (review) => <StatusBadge status={review.status} />,
              },
              {
                id: "context",
                header: "السياق",
                cell: (review) => (
                  <div className="text-sm text-ink-strong">
                    <div>
                      المشتري:{" "}
                      {review.user
                        ? formatName({
                            firstName: review.user.firstName,
                            lastName: review.user.lastName,
                          })
                        : "-"}
                    </div>
                    <div>
                      المنتج:{" "}
                      {review.product?.publicId ? (
                        <Link
                          href={`/products/${review.product.publicId}`}
                          className="text-primary hover:underline"
                        >
                          {localizedText(review.product.title, review.product.slug, "ar")}
                        </Link>
                      ) : (
                        localizedText(review.product?.title, review.product?.slug, "ar")
                      )}
                    </div>
                    <div>
                      البائع:{" "}
                      {review.vendor?.publicId ? (
                        <Link
                          href={`/stores/${review.vendor.publicId}`}
                          className="text-primary hover:underline"
                        >
                          {localizedText(review.vendor.displayName, review.vendor.publicId, "ar")}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </div>
                  </div>
                ),
              },
              {
                id: "moderation",
                header: "الاعتدال",
                cell: (review) => (
                  <div className="text-sm text-ink-strong">
                    <div>تم الإنشاء {formatDate(review.createdAt)}</div>
                    <div>تمت المراجعة {formatDate(review.moderatedAt)}</div>
                    {review.moderationReason ? (
                      <div className="mt-1 text-xs font-semibold text-destructive">
                        {review.moderationReason}
                      </div>
                    ) : null}
                  </div>
                ),
              },
              {
                id: "actions",
                header: "إجراءات",
                cell: (review) => (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-success"
                      disabled={moderateReview.isPending || review.status === "APPROVED"}
                      onClick={() =>
                        setPendingAction({
                          reviewId: review.publicId,
                          status: "APPROVED",
                          label: review.title ?? review.publicId,
                        })
                      }
                    >
                      اعتماد
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-danger"
                      disabled={moderateReview.isPending || review.status === "REJECTED"}
                      onClick={() =>
                        setPendingAction({
                          reviewId: review.publicId,
                          status: "REJECTED",
                          label: review.title ?? review.publicId,
                        })
                      }
                    >
                      رفض
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-danger"
                      disabled={deleteReview.isPending}
                      onClick={async () => {
                        const result = await confirm({
                          title: "حذف المراجعة",
                          description: "هل أنت متأكد من حذف هذه المراجعة نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.",
                          confirmLabel: "حذف نهائي",
                          variant: "danger",
                          requireReason: true,
                          reasonLabel: "سبب الحذف",
                        });
                        if (result.confirmed) {
                          deleteReview.mutate(review.publicId);
                        }
                      }}
                    >
                      حذف
                    </Button>
                  </div>
                ),
              },
            ]}
          />
          <CursorPager
            nextCursor={reviews.data?.nextCursor}
            hasMore={reviews.data?.hasMore}
          />
        </>
      )}

      <ActionDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.status === "APPROVED" ? "اعتماد المراجعة" : "رفض المراجعة"}
        description={
          pendingAction
            ? `${pendingAction.status === "APPROVED" ? "سيتم اعتماد" : "سيتم رفض"} المراجعة: ${pendingAction.label}`
            : ""
        }
        confirmLabel={pendingAction?.status === "APPROVED" ? "اعتماد" : "رفض"}
        variant={pendingAction?.status === "APPROVED" ? "success" : "danger"}
        requireReason={pendingAction?.status === "REJECTED"}
        disabled={moderateReview.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={(reason) => {
          if (!pendingAction) return;
          moderateReview.mutate(
            {
              reviewId: pendingAction.reviewId,
              status: pendingAction.status,
              reason,
            },
            { onSettled: () => setPendingAction(null) },
          );
        }}
      />
      {confirmElement}
    </div>
  );
}
