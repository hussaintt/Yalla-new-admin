"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Calendar, Package, Pencil, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { EntityEditorDrawer } from "@/components/forms/entity-editor-drawer";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { ActionDialog } from "@/components/modals/action-dialog";
import { VendorNotifyDialog } from "@/components/modals/vendor-notify-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/state/async-states";
import { SectionCard } from "@/components/ui/section-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { ClickableImageWithFileFallback } from "@/components/clickable-image-fallback";
import { StatusBadge } from "@/components/status/status-badge";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { VendorDetail, VerificationRow } from "@/lib/api/types";
import { formatDate, localizedText } from "@/lib/formatters";
import { useCurrentAdmin } from "@/features/auth/use-current-admin";
import { hasPermission } from "@/lib/auth/permissions";
import { useVendorNotify } from "@/features/vendors/use-vendor-notify";
import { cn } from "@/lib/utils";

function i18nValue(value: unknown, locale: "ar" | "en"): string {
  if (value && typeof value === "object") {
    const localized = (value as Record<string, unknown>)[locale];
    return typeof localized === "string" ? localized : "";
  }
  return locale === "ar" && typeof value === "string" ? value : "";
}

const vendorEditSchema = z.object({
  displayName: z.object({
    ar: z.string().trim().min(1, "الاسم العربي مطلوب"),
    en: z.string().trim().optional().or(z.literal("")),
  }),
  description: z.object({
    ar: z.string().trim().optional().or(z.literal("")),
    en: z.string().trim().optional().or(z.literal("")),
  }),
  email: z.string().trim().email("بريد إلكتروني غير صالح").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  storeType: z.string().trim().optional().or(z.literal("")),
});

type VendorEditValues = z.infer<typeof vendorEditSchema>;

type PendingVerificationAction = {
  verificationId: number;
  status: "APPROVED" | "REJECTED";
  label: string;
};

type PendingVendorStatusAction = {
  status: "APPROVED" | "REJECTED" | "SUSPENDED";
  title: string;
  confirmLabel: string;
  variant: "success" | "danger" | "default";
  requireReason: boolean;
};

export function VendorDetailPage({ vendorId }: { vendorId: string }) {
  const queryClient = useQueryClient();
  const { data: admin } = useCurrentAdmin();
  const canNotify =
    hasPermission(admin, "vendors:write") ||
    hasPermission(admin, "notifications:write");
  const [pendingAction, setPendingAction] = useState<PendingVerificationAction | null>(null);
  const [pendingVendorStatus, setPendingVendorStatus] = useState<PendingVendorStatusAction | null>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const notifyMutation = useVendorNotify(vendorId);
  const canEdit = hasPermission(admin, "vendors:write");

  const vendor = useQuery({
    queryKey: queryKeys.vendorDetail(vendorId),
    queryFn: () => adminApi<VendorDetail>(adminPaths.vendorDetail(vendorId)),
  });

  const verifications = useQuery({
    queryKey: queryKeys.vendorVerifications(vendorId),
    queryFn: () =>
      adminApi<VerificationRow[]>(adminPaths.vendorVerifications(vendorId)),
  });

  const reviewVerification = useMutation({
    mutationFn: ({
      verificationId,
      status,
      rejectionReason,
    }: {
      verificationId: number;
      status: "APPROVED" | "REJECTED";
      rejectionReason?: string;
    }) =>
      adminApi(adminPaths.vendorVerification(vendorId, verificationId), {
        method: "PATCH",
        body: { status, rejectionReason },
      }),
    onSuccess: async () => {
      toast.success("تمت مراجعة الوثيقة");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.vendorVerifications(vendorId),
      });
      await queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "تعذر مراجعة الوثيقة",
      );
    },
  });

  const updateVendorStatus = useMutation({
    mutationFn: ({
      status,
      reason,
    }: {
      status: "APPROVED" | "REJECTED" | "SUSPENDED";
      reason?: string;
    }) =>
      adminApi(adminPaths.vendorStatus(vendorId), {
        method: "PATCH",
        body: { status, reason },
      }),
    onSuccess: async () => {
      toast.success("تم تحديث حالة البائع");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.vendorDetail(vendorId),
      });
      await queryClient.invalidateQueries({ queryKey: ["vendors"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.overview(30) });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "تعذر تحديث حالة البائع",
      );
    },
  });

  const updateVendor = useMutation({
    mutationFn: (values: VendorEditValues) => {
      const body: Record<string, unknown> = {
        displayName: values.displayName,
        description: values.description,
        storeType: values.storeType || undefined,
        phone: values.phone || undefined,
      };
      // Only send email when present to avoid clearing it with an empty value.
      if (values.email) body.email = values.email;
      return adminApi(adminPaths.vendorDetail(vendorId), {
        method: "PATCH",
        body,
      });
    },
    onSuccess: async () => {
      toast.success("تم تحديث بيانات البائع");
      await queryClient.invalidateQueries({ queryKey: queryKeys.vendorDetail(vendorId) });
      await queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setEditOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث البائع");
    },
  });

  if (vendor.isLoading) return <LoadingState label="جار تحميل البائع" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={localizedText(vendor.data?.displayName, vendor.data?.legalName ?? vendorId, "ar")}
        description="ملف البائع، الحالة التشغيلية، ووثائق التحقق المرتبطة بالبائع."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canNotify ? (
              <button
                type="button"
                onClick={() => setNotifyOpen(true)}
                disabled={notifyMutation.isPending}
                className="inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:opacity-50"
              >
                إرسال إشعار
              </button>
            ) : null}
            <Link
              href="/vendors"
              className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted"
            >
              كل البائعين
            </Link>
          </div>
        }
      />

      {vendor.isError ? (
        <ErrorState message={vendor.error.message} />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-4">
            <KpiCard
              icon={Package}
              tone="teal"
              value={vendor.data?.productCount ?? vendor.data?._count?.products ?? 0}
              label="المنتجات"
            />
            <KpiCard
              icon={Star}
              tone="orange"
              value={String(vendor.data?.ratingAverage ?? "0")}
              label="التقييم"
            />
            <KpiCard
              icon={Calendar}
              tone="blue"
              value={formatDate(vendor.data?.createdAt)}
              label="تاريخ الإنشاء"
            />
            <KpiCard
              icon={Package}
              tone="green"
              value={vendor.data?.status ?? "—"}
              label="الحالة التشغيلية"
            />
          </section>

          <SectionCard
            title="بيانات المتجر والنشاط التجاري"
            description="معلومات الحساب والوصف والسجل القانوني."
            actions={
              canEdit ? (
                <Button type="button" size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  تعديل البيانات
                </Button>
              ) : undefined
            }
          >
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-bold text-ink-muted">الاسم القانوني</dt>
                <dd className="mt-1 text-sm font-semibold text-ink-strong">{vendor.data?.legalName ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-ink-muted">الاسم المعروض</dt>
                <dd className="mt-1 text-sm font-semibold text-ink-strong">{localizedText(vendor.data?.displayName, "-", "ar")}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-ink-muted">نوع العمل / المتجر</dt>
                <dd className="mt-1 text-sm font-semibold text-ink-strong">{vendor.data?.storeType ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-ink-muted">البريد الإلكتروني للبائع</dt>
                <dd className="mt-1 text-sm font-semibold text-ink-strong">{vendor.data?.email ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-ink-muted">رقم الهاتف</dt>
                <dd className="mt-1 text-sm font-semibold text-ink-strong" dir="ltr">{vendor.data?.phone ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-ink-muted">معرف المسار (Slug)</dt>
                <dd className="mt-1 text-sm font-semibold text-ink-strong">{vendor.data?.slug ?? "-"}</dd>
              </div>
              <div className="sm:col-span-3">
                <dt className="text-xs font-bold text-ink-muted">الوصف</dt>
                <dd className="mt-1 text-sm leading-relaxed text-ink-strong">{localizedText(vendor.data?.description, "-", "ar")}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title="القرارات الإدارية للمتجر"
            description="تحكم في الحالة التشغيلية للبائع. تتطلب عمليات الرفض أو الإيقاف كتابة سبب توضيحي."
          >
            <div className="flex flex-wrap gap-2">
              {vendor.data?.status !== "APPROVED" ? (
                <button
                  type="button"
                  disabled={updateVendorStatus.isPending}
                  onClick={() =>
                    setPendingVendorStatus({
                      status: "APPROVED",
                      title: "اعتماد البائع وتفعيل الحساب",
                      confirmLabel: "اعتماد وتفعيل",
                      variant: "success",
                      requireReason: false,
                    })
                  }
                  className={cn(
                    "inline-flex h-10 items-center rounded-2xl px-4 text-sm font-bold shadow-sm transition disabled:opacity-50",
                    "bg-success text-success-foreground hover:bg-success/90",
                  )}
                >
                  اعتماد وتفعيل المتجر
                </button>
              ) : null}

              {vendor.data?.status === "APPROVED" ? (
                <button
                  type="button"
                  disabled={updateVendorStatus.isPending}
                  onClick={() =>
                    setPendingVendorStatus({
                      status: "SUSPENDED",
                      title: "إيقاف حساب البائع مؤقتاً",
                      confirmLabel: "إيقاف الحساب",
                      variant: "danger",
                      requireReason: true,
                    })
                  }
                  className={cn(
                    "inline-flex h-10 items-center rounded-2xl px-4 text-sm font-bold shadow-sm transition disabled:opacity-50",
                    "bg-warning text-warning-foreground hover:bg-warning/90",
                  )}
                >
                  إيقاف مؤقت للمتجر
                </button>
              ) : null}

              {vendor.data?.status === "PENDING" ? (
                <button
                  type="button"
                  disabled={updateVendorStatus.isPending}
                  onClick={() =>
                    setPendingVendorStatus({
                      status: "REJECTED",
                      title: "رفض طلب انضمام البائع",
                      confirmLabel: "رفض الطلب",
                      variant: "danger",
                      requireReason: true,
                    })
                  }
                  className={cn(
                    "inline-flex h-10 items-center rounded-2xl px-4 text-sm font-bold shadow-sm transition disabled:opacity-50",
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                  )}
                >
                  رفض انضمام البائع
                </button>
              ) : null}
            </div>
          </SectionCard>
        </div>
      )}

      <SectionCard
        title="وثائق التحقق"
        description="الوثائق الرسمية المقدمة من البائع والتي تنتظر المراجعة."
      >
        {verifications.isLoading ? (
          <LoadingState label="جار تحميل الوثائق" />
        ) : verifications.isError ? (
          <ErrorState message={verifications.error.message} />
        ) : !verifications.data || verifications.data.length === 0 ? (
          <EmptyState
            title="لا توجد وثائق تحقق"
            description="لم يرسل هذا البائع وثائق تحقق بعد."
          />
        ) : (
          <CursorDataTable
            data={verifications.data}
            getRowKey={(row) => row.id}
            columns={[
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
                  <div className="text-sm text-ink-strong">
                    <div>تم الإرسال {formatDate(row.createdAt)}</div>
                    <div>تمت المراجعة {formatDate(row.reviewedAt)}</div>
                    <div>تنتهي {formatDate(row.expiresAt)}</div>
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
                          verificationId: row.id,
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
                          verificationId: row.id,
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
        )}
      </SectionCard>

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

      <ActionDialog
        open={Boolean(pendingVendorStatus)}
        title={pendingVendorStatus?.title ?? ""}
        description={
          pendingVendorStatus
            ? `هل أنت متأكد من تغيير حالة البائع إلى: ${pendingVendorStatus.confirmLabel}؟`
            : ""
        }
        confirmLabel={pendingVendorStatus?.confirmLabel ?? ""}
        variant={pendingVendorStatus?.variant ?? "default"}
        requireReason={pendingVendorStatus?.requireReason ?? false}
        reasonLabel="السبب"
        reasonPlaceholder="اكتب سبب تغيير حالة البائع لظهوره في سجل التدقيق"
        disabled={updateVendorStatus.isPending}
        onCancel={() => setPendingVendorStatus(null)}
        onConfirm={(reason) => {
          if (!pendingVendorStatus) return;
          updateVendorStatus.mutate(
            { status: pendingVendorStatus.status, reason },
            { onSettled: () => setPendingVendorStatus(null) },
          );
        }}
      />

      <VendorNotifyDialog
        open={notifyOpen}
        vendorName={localizedText(vendor.data?.displayName, vendor.data?.legalName, "ar")}
        disabled={notifyMutation.isPending}
        onCancel={() => setNotifyOpen(false)}
        onConfirm={(payload) => {
          notifyMutation.mutate(payload, {
            onSettled: () => setNotifyOpen(false),
          });
        }}
      />

      <EntityEditorDrawer<VendorEditValues>
        open={editOpen}
        onOpenChange={setEditOpen}
        title="تعديل بيانات البائع"
        description="حدّث الاسم المعروض والوصف وبيانات التواصل. لا يؤثر هذا على إعدادات العمولة."
        schema={vendorEditSchema}
        pending={updateVendor.isPending}
        defaultValues={{
          displayName: {
            ar: i18nValue(vendor.data?.displayName, "ar"),
            en: i18nValue(vendor.data?.displayName, "en"),
          },
          description: {
            ar: i18nValue(vendor.data?.description, "ar"),
            en: i18nValue(vendor.data?.description, "en"),
          },
          email: vendor.data?.email ?? "",
          phone: vendor.data?.phone ?? "",
          storeType: vendor.data?.storeType ?? "",
        }}
        fields={[
          { name: "displayName.ar", label: "الاسم المعروض (عربي)", required: true },
          { name: "displayName.en", label: "الاسم المعروض (إنجليزي)", dir: "ltr" },
          { name: "description.ar", label: "الوصف (عربي)", kind: "textarea", colSpan: 2 },
          { name: "description.en", label: "الوصف (إنجليزي)", kind: "textarea", colSpan: 2, dir: "ltr" },
          { name: "email", label: "البريد الإلكتروني", kind: "email", dir: "ltr" },
          { name: "phone", label: "رقم الهاتف", kind: "tel", dir: "ltr" },
          { name: "storeType", label: "نوع المتجر", colSpan: 2 },
        ]}
        onSubmit={(values) => updateVendor.mutate(values)}
      />
    </div>
  );
}
