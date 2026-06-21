"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ClickableImageWithFileFallback } from "@/components/clickable-image-fallback";
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
import { formatDate, localizedText } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type ProfileFields = {
  displayName?: unknown;
  description?: unknown;
  phone?: string | null;
  businessAddressLine?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
};

type EditRequestRow = {
  id: number;
  publicId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUPERSEDED";
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  vendor: {
    publicId: string;
    slug: string;
    legalName: string;
    displayName: unknown;
    status: string;
  };
  submittedBy: {
    publicId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  proposed: ProfileFields;
  current: ProfileFields;
};

type EditRequestPage = {
  data: EditRequestRow[];
  nextCursor?: string;
  hasMore: boolean;
};

type PendingEditAction = {
  editId: string;
  status: "APPROVED" | "REJECTED";
  storeName: string;
};

const editStatuses = [
  { label: "قيد المراجعة", value: "PENDING" },
  { label: "معتمد", value: "APPROVED" },
  { label: "مرفوض", value: "REJECTED" },
  { label: "ملغى", value: "SUPERSEDED" },
];

const FIELD_LABELS: Record<keyof ProfileFields, string> = {
  displayName: "اسم المتجر",
  description: "الوصف",
  phone: "رقم التواصل",
  businessAddressLine: "العنوان",
  logoUrl: "الشعار",
  bannerUrl: "الغلاف",
};

const LOCALIZED_FIELDS = new Set<keyof ProfileFields>(["displayName", "description"]);
const IMAGE_FIELDS = new Set<keyof ProfileFields>(["logoUrl", "bannerUrl"]);

function textValue(field: keyof ProfileFields, value: unknown) {
  if (LOCALIZED_FIELDS.has(field)) return localizedText(value, "—", "ar");
  return value ? String(value) : "—";
}

function ChangesCell({ row }: { row: EditRequestRow }) {
  const keys = (Object.keys(row.proposed) as (keyof ProfileFields)[]).filter(
    (key) => row.proposed[key] !== undefined,
  );
  if (keys.length === 0) return <span className="text-ink-muted">-</span>;

  return (
    <div className="flex max-w-sm flex-col gap-2 py-1">
      {keys.map((key) => {
        const label = FIELD_LABELS[key] ?? key;
        if (IMAGE_FIELDS.has(key)) {
          return (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className="font-medium text-ink-strong">{label}:</span>
              {row.current[key] ? (
                <div className="h-9 w-9 overflow-hidden rounded opacity-60">
                  <ClickableImageWithFileFallback
                    src={String(row.current[key])}
                    alt={`${label} الحالي`}
                    className="h-full w-full object-cover"
                    fallbackLabel="الحالي"
                  />
                </div>
              ) : (
                <span className="text-ink-muted">—</span>
              )}
              <span aria-hidden>←</span>
              {row.proposed[key] ? (
                <div className="h-9 w-9 overflow-hidden rounded ring-1 ring-success/40">
                  <ClickableImageWithFileFallback
                    src={String(row.proposed[key])}
                    alt={`${label} المقترح`}
                    className="h-full w-full object-cover"
                    fallbackLabel="المقترح"
                  />
                </div>
              ) : (
                <span className="text-ink-muted">—</span>
              )}
            </div>
          );
        }
        return (
          <div key={key} className="text-xs leading-relaxed">
            <span className="font-medium text-ink-strong">{label}: </span>
            <span className="text-ink-muted line-through">
              {textValue(key, row.current[key])}
            </span>
            <span className="px-1" aria-hidden>
              ←
            </span>
            <span className="text-ink-strong">
              {textValue(key, row.proposed[key])}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function StoreEditsPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<PendingEditAction | null>(null);

  const queryParams = {
    status: searchParams.get("status") ?? "PENDING",
    cursor: searchParams.get("cursor") ?? undefined,
    limit: "20",
  };

  const editRequests = useQuery({
    queryKey: queryKeys.vendorEditRequests(queryParams),
    queryFn: () =>
      adminApi<EditRequestPage>(adminPaths.vendorEditRequests(queryParams)),
  });

  const reviewEdit = useMutation({
    mutationFn: ({
      editId,
      status,
      rejectionReason,
    }: {
      editId: string;
      status: "APPROVED" | "REJECTED";
      rejectionReason?: string;
    }) =>
      adminApi(adminPaths.vendorEditReview(editId), {
        method: "PATCH",
        body: { status, rejectionReason },
      }),
    onSuccess: async () => {
      toast.success("تمت مراجعة التعديل بنجاح");
      await queryClient.invalidateQueries({ queryKey: ["vendorEditRequests"] });
      await queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر مراجعة التعديل");
    },
  });

  const rows = editRequests.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="تعديلات المتاجر"
        description="مراجعة واعتماد التعديلات التي يقترحها البائعون على بيانات متاجرهم المعتمدة قبل نشرها."
      />

      <TableToolbar statusOptions={editStatuses} />

      {editRequests.isLoading ? (
        <LoadingState label="جار تحميل التعديلات" />
      ) : editRequests.isError ? (
        <ErrorState message={editRequests.error.message} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="لا توجد تعديلات في هذه القائمة"
          description="جرّب اختيار حالة أخرى."
        />
      ) : (
        <>
          <CursorDataTable
            data={rows}
            getRowKey={(row) => row.publicId}
            columns={[
              {
                id: "store",
                header: "المتجر",
                cell: (row) => (
                  <div>
                    <Link
                      href={`/stores/${row.vendor.publicId}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {localizedText(row.vendor.displayName, row.vendor.legalName, "ar")}
                    </Link>
                    <div className="text-xs text-ink-muted">{row.vendor.slug}</div>
                  </div>
                ),
              },
              {
                id: "changes",
                header: "التغييرات",
                cell: (row) => <ChangesCell row={row} />,
              },
              {
                id: "submittedBy",
                header: "مقدّم الطلب",
                cell: (row) =>
                  row.submittedBy ? (
                    <div className="text-xs text-ink-strong">
                      <div>
                        {`${row.submittedBy.firstName ?? ""} ${row.submittedBy.lastName ?? ""}`.trim() ||
                          row.submittedBy.email}
                      </div>
                      <div className="text-ink-muted">{row.submittedBy.email}</div>
                    </div>
                  ) : (
                    <span className="text-ink-muted">-</span>
                  ),
              },
              {
                id: "status",
                header: "الحالة",
                cell: (row) => (
                  <div>
                    <StatusBadge status={row.status} />
                    {row.rejectionReason ? (
                      <div className="mt-1 max-w-[12rem] text-[11px] text-destructive">
                        {row.rejectionReason}
                      </div>
                    ) : null}
                  </div>
                ),
              },
              {
                id: "dates",
                header: "التواريخ",
                cell: (row) => (
                  <div className="text-xs text-ink-strong">
                    <div>تم الإرسال {formatDate(row.createdAt)}</div>
                    {row.reviewedAt ? (
                      <div>تمت المراجعة {formatDate(row.reviewedAt)}</div>
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
                      disabled={reviewEdit.isPending || row.status !== "PENDING"}
                      onClick={() =>
                        setPendingAction({
                          editId: row.publicId,
                          status: "APPROVED",
                          storeName: localizedText(
                            row.vendor.displayName,
                            row.vendor.legalName,
                            "ar",
                          ),
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
                      disabled={reviewEdit.isPending || row.status !== "PENDING"}
                      onClick={() =>
                        setPendingAction({
                          editId: row.publicId,
                          status: "REJECTED",
                          storeName: localizedText(
                            row.vendor.displayName,
                            row.vendor.legalName,
                            "ar",
                          ),
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
            nextCursor={editRequests.data?.nextCursor}
            hasMore={editRequests.data?.hasMore}
          />
        </>
      )}

      <ActionDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.status === "APPROVED" ? "اعتماد التعديل" : "رفض التعديل"}
        description={
          pendingAction
            ? `${pendingAction.status === "APPROVED" ? "سيتم نشر التعديلات على" : "سيتم رفض تعديلات"} ${pendingAction.storeName}.`
            : ""
        }
        confirmLabel={pendingAction?.status === "APPROVED" ? "اعتماد" : "رفض"}
        variant={pendingAction?.status === "APPROVED" ? "success" : "danger"}
        requireReason={pendingAction?.status === "REJECTED"}
        reasonLabel="سبب الرفض"
        reasonPlaceholder="اكتب سبب الرفض ليظهر للبائع"
        disabled={reviewEdit.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={(reason) => {
          if (!pendingAction) return;
          reviewEdit.mutate(
            {
              editId: pendingAction.editId,
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
