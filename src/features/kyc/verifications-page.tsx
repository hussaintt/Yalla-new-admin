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
import { EmptyState, ErrorState, LoadingState } from "@/components/state/async-states";
import { StatusBadge } from "@/components/status/status-badge";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import { ClickableImageWithFileFallback } from "@/components/clickable-image-fallback";
import { formatDate, localizedText } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type VerificationRow = {
  id: number;
  publicId: string;
  vendorId?: number;
  userId?: number;
  type: "vendor" | "user";
  documentType: string;
  documentNumber: string | null;
  fileUrl: string | null;
  frontFileUrl: string | null;
  backFileUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedById: number | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  vendor?: {
    publicId: string;
    displayName: unknown;
    slug: string;
  };
  user?: {
    publicId: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
};

type VerificationPage = {
  data: VerificationRow[];
  nextCursor?: string;
  hasMore: boolean;
};

type PendingVerificationAction = {
  verificationId: string;
  status: "APPROVED" | "REJECTED";
  label: string;
};

const verificationStatuses = [
  { label: "وثائق قيد المراجعة", value: "PENDING" },
  { label: "وثائق معتمدة", value: "APPROVED" },
  { label: "وثائق مرفوضة", value: "REJECTED" },
];

export default function VerificationsPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<PendingVerificationAction | null>(null);

  const queryParams = {
    status: searchParams.get("status") ?? "PENDING",
    cursor: searchParams.get("cursor") ?? undefined,
    limit: "20",
  };

  const verifications = useQuery({
    queryKey: queryKeys.verifications(queryParams),
    queryFn: () =>
      adminApi<VerificationPage>(adminPaths.verifications(queryParams)),
  });

  const reviewVerification = useMutation({
    mutationFn: ({
      verificationId,
      status,
      rejectionReason,
    }: {
      verificationId: string;
      status: "APPROVED" | "REJECTED";
      rejectionReason?: string;
    }) =>
      adminApi(adminPaths.verificationsReview(verificationId), {
        method: "PATCH",
        body: { status, rejectionReason },
      }),
    onSuccess: async () => {
      toast.success("تمت مراجعة الوثيقة بنجاح");
      await queryClient.invalidateQueries({
        queryKey: ["verifications"],
      });
      await queryClient.invalidateQueries({ queryKey: ["vendors"] });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "تعذر مراجعة الوثيقة",
      );
    },
  });

  const rows = verifications.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="التحقق والوثائق"
        description="مراجعة واعتماد وثائق الـ KYC والمستندات الرسمية المقدمة من البائعين والمستخدمين."
      />

      <TableToolbar
        searchPlaceholder="ابحث في وثائق التحقق..."
        statusOptions={verificationStatuses}
        showSearch={false}
      />

      {verifications.isLoading ? (
        <LoadingState label="جار تحميل قائمة التحقق" />
      ) : verifications.isError ? (
        <ErrorState message={verifications.error.message} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="لا توجد طلبات تحقق في هذه القائمة"
          description="جرّب اختيار حالة أخرى للوثائق."
        />
      ) : (
        <>
          <CursorDataTable
            data={rows}
            getRowKey={(row) => String(row.id)}
            columns={[
              {
                id: "owner",
                header: "الجهة المستندة",
                cell: (row) => {
                  if (row.type === "vendor" && row.vendor) {
                    return (
                      <div>
                        <span
                          className={cn(
                            "mb-1 inline-block rounded-full bg-brand-teal-50 px-2 py-0.5 text-[10px] font-bold text-primary",
                          )}
                        >
                          بائع
                        </span>
                        <div>
                          <Link
                            href={`/vendors/${row.vendor.publicId}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {localizedText(row.vendor.displayName, row.vendor.slug, "ar")}
                          </Link>
                        </div>
                        <div className="text-xs text-ink-muted">{row.vendor.slug}</div>
                      </div>
                    );
                  }
                  if (row.type === "user" && row.user) {
                    return (
                      <div>
                        <span className="mb-1 inline-block rounded-full bg-brand-purple-50 px-2 py-0.5 text-[10px] font-bold text-brand-purple">
                          حساب مستخدم
                        </span>
                        <div>
                          <Link
                            href={`/users/${row.user.publicId}`}
                            className="font-medium text-brand-purple hover:underline"
                          >
                            {`${row.user.firstName ?? ""} ${row.user.lastName ?? ""}`.trim() || row.user.email}
                          </Link>
                        </div>
                        <div className="text-xs text-ink-muted">{row.user.email}</div>
                      </div>
                    );
                  }
                  return <span className="text-ink-muted">-</span>;
                },
              },
              {
                id: "document",
                header: "الوثيقة",
                cell: (row) => (
                  <div>
                    <div className="font-medium text-ink-strong">{row.documentType}</div>
                    <div className="text-xs text-ink-muted">{row.documentNumber ?? "-"}</div>
                  </div>
                ),
              },
              {
                id: "status",
                header: "الحالة",
                cell: (row) => <StatusBadge status={row.status} />,
              },
              {
                id: "dates",
                header: "التواريخ",
                cell: (row) => (
                  <div className="text-xs text-ink-strong">
                    <div>تم الإرسال {formatDate(row.createdAt)}</div>
                    {row.reviewedAt ? <div>تمت المراجعة {formatDate(row.reviewedAt)}</div> : null}
                    {row.expiresAt ? <div>تنتهي {formatDate(row.expiresAt)}</div> : null}
                  </div>
                ),
              },
              {
                id: "files",
                header: "الملفات",
                cell: (row) => (
                  <div className="flex flex-col gap-2 py-1">
                    {row.fileUrl ? (
                      <div className="flex items-center gap-2">
                        <ClickableImageWithFileFallback src={String(row.fileUrl)} alt="الملف الرئيسي" className="h-full w-full object-cover" fallbackLabel="فتح الملف" />
                        <span className="text-xs text-ink-strong">الملف الرئيسي</span>
                      </div>
                    ) : null}
                    {row.frontFileUrl ? (
                      <div className="flex items-center gap-2">
                        <ClickableImageWithFileFallback src={String(row.frontFileUrl)} alt="الوجه الأمامي" className="h-full w-full object-cover" fallbackLabel="الوجه الأمامي" />
                        <span className="text-xs text-ink-strong">الوجه الأمامي</span>
                      </div>
                    ) : null}
                    {row.backFileUrl ? (
                      <div className="flex items-center gap-2">
                        <ClickableImageWithFileFallback src={String(row.backFileUrl)} alt="الوجه الخلفي" className="h-full w-full object-cover" fallbackLabel="الوجه الخلفي" />
                        <span className="text-xs text-ink-strong">الوجه الخلفي</span>
                      </div>
                    ) : null}
                  </div>
                ),
              },
              {
                id: "actions",
                header: "إجراءات",
                cell: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={reviewVerification.isPending || row.status === "APPROVED"}
                      onClick={() =>
                        setPendingAction({
                          verificationId: row.publicId,
                          status: "APPROVED",
                          label: row.documentType,
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
                      disabled={reviewVerification.isPending || row.status === "REJECTED"}
                      onClick={() =>
                        setPendingAction({
                          verificationId: row.publicId,
                          status: "REJECTED",
                          label: row.documentType,
                        })
                      }
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
                        "border-destructive/30 text-destructive hover:bg-destructive-soft",
                      )}
                    >
                      رفض
                    </button>
                  </div>
                ),
              },
            ]}
          />
          <CursorPager
            nextCursor={verifications.data?.nextCursor}
            hasMore={verifications.data?.hasMore}
          />
        </>
      )}

      <ActionDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.status === "APPROVED" ? "اعتماد الوثيقة" : "رفض الوثيقة"}
        description={
          pendingAction
            ? `${pendingAction.status === "APPROVED" ? "سيتم اعتماد" : "سيتم رفض"} وثيقة ${pendingAction.label}.`
            : ""
        }
        confirmLabel={pendingAction?.status === "APPROVED" ? "اعتماد" : "رفض"}
        variant={pendingAction?.status === "APPROVED" ? "success" : "danger"}
        requireReason={pendingAction?.status === "REJECTED"}
        disabled={reviewVerification.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={(reason) => {
          if (!pendingAction) return;
          reviewVerification.mutate(
            {
              verificationId: pendingAction.verificationId,
              status: pendingAction.status,
              rejectionReason: reason,
            },
            { onSettled: () => setPendingAction(null) },
          );
        }}
      />
    </div>
  );
}
