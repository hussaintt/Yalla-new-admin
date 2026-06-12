"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Calendar, Mail, Package, Phone, ShieldCheck, Store, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { PageHeader } from "@/components/layout/page-header";
import { ActionDialog } from "@/components/modals/action-dialog";
import { VendorNotifyDialog } from "@/components/modals/vendor-notify-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/state/async-states";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { ClickableImageWithFileFallback } from "@/components/clickable-image-fallback";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { AdminUserRow, AdminVendorRow, VerificationRow } from "@/lib/api/types";
import { formatDate, formatName, localizedText, formatMoney } from "@/lib/formatters";
import { useCurrentAdmin } from "@/features/auth/use-current-admin";
import { hasPermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

type AnyRecord = Record<string, unknown>;

type UserDetail = AdminUserRow & {
  vendors?: AdminVendorRow[];
  stores?: AdminVendorRow[];
  type?: string;
};

type PendingStatusAction = {
  status: "ACTIVE" | "SUSPENDED";
  title: string;
  confirmLabel: string;
  variant: "success" | "danger";
  requireReason: boolean;
};

type PendingNotifyAction = {
  vendorId: string;
  vendorName: string;
};

function DetailGrid({ rows }: { rows: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <SectionCard>
      <dl className="grid gap-4 md:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs font-semibold text-ink-muted">{row.label}</dt>
            <dd className="mt-1 text-sm text-ink-strong">{row.value}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}

export function VendorDetailPage({ vendorId }: { vendorId: string }) {
  const queryClient = useQueryClient();
  const { data: admin } = useCurrentAdmin();
  const canWrite = hasPermission(admin, "vendors:write") || hasPermission(admin, "users:write");
  const canNotify =
    hasPermission(admin, "vendors:write") ||
    hasPermission(admin, "notifications:write");
  const [pendingStatus, setPendingStatus] = useState<PendingStatusAction | null>(null);
  const [notifyTarget, setNotifyTarget] = useState<PendingNotifyAction | null>(null);

  const userQuery = useQuery({
    queryKey: ["users", vendorId],
    queryFn: () => adminApi<UserDetail>(adminPaths.adminUserDetail(vendorId)),
  });

  const storesQuery = useQuery({
    queryKey: ["users", vendorId, "stores"],
    queryFn: () => adminApi<unknown>(`/api/admin/admin/users/${vendorId}/vendors`),
    retry: false,
  });

  const ordersQuery = useQuery({
    queryKey: ["users", vendorId, "orders"],
    queryFn: () => adminApi<unknown>(`/api/admin/admin/users/${vendorId}/orders?limit=10`),
    retry: false,
  });

  const updateStatus = useMutation({
    mutationFn: ({
      status,
      reason,
    }: {
      status: string;
      reason?: string;
    }) =>
      adminApi(adminPaths.adminUserStatus(vendorId), {
        method: "PATCH",
        body: { status, reason },
      }),
    onSuccess: async () => {
      toast.success("تم تحديث حالة البائع");
      await queryClient.invalidateQueries({ queryKey: ["users", vendorId] });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.overview(30) });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث حالة البائع");
    },
  });

  const user = userQuery.data;

  const storesPayload = storesQuery.data;
  const stores: AdminVendorRow[] = (() => {
    if (user?.vendors && Array.isArray(user.vendors) && user.vendors.length > 0) return user.vendors;
    if (user?.stores && Array.isArray(user.stores) && user.stores.length > 0) return user.stores;
    if (Array.isArray(storesPayload)) return storesPayload as AdminVendorRow[];
    if (storesPayload && typeof storesPayload === "object") {
      const record = storesPayload as { data?: unknown };
      if (Array.isArray(record.data)) return record.data as AdminVendorRow[];
    }
    return [];
  })();

  const ordersPayload = ordersQuery.data;
  const orders: AnyRecord[] = (() => {
    if (Array.isArray(ordersPayload)) return ordersPayload as AnyRecord[];
    if (ordersPayload && typeof ordersPayload === "object") {
      const record = ordersPayload as { data?: unknown };
      if (Array.isArray(record.data)) return record.data as AnyRecord[];
    }
    return [];
  })();

  if (userQuery.isLoading) return <LoadingState label="جار تحميل بيانات البائع" />;
  if (userQuery.isError) return <ErrorState message={userQuery.error.message} />;
  if (!user) return <EmptyState title="البائع غير موجود" description="لم نتمكن من العثور على هذا البائع." />;

  const nextStatus = user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`ملف البائع: ${formatName(user)}`}
        description="عرض بيانات حساب البائع، المتاجر المملوكة، والطلبات الأخيرة."
        actions={
          <Link
            href="/vendors"
            className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted"
          >
            كل البائعين
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <KpiCard
          icon={User}
          tone="teal"
          value={user.status ?? "---"}
          label="حالة الحساب"
        />
        <KpiCard
          icon={Store}
          tone="purple"
          value={stores.length}
          label="المتاجر"
        />
        <KpiCard
          icon={Package}
          tone="orange"
          value={orders.length > 0 ? `${orders.length}+` : "0"}
          label="آخر الطلبات"
        />
        <KpiCard
          icon={Calendar}
          tone="blue"
          value={formatDate(user.createdAt)}
          label="تاريخ التسجيل"
        />
      </section>

      <DetailGrid
        rows={[
          { label: "المعرف العام", value: <span className="flex items-center gap-1">{user.publicId} <CopyButton value={user.publicId} /></span> },
          { label: "البريد الإلكتروني", value: user.email ?? "-" },
          { label: "رقم الهاتف", value: <span dir="ltr">{user.phone ?? "-"}</span> },
          { label: "الحالة", value: <StatusBadge status={user.status} /> },
          { label: "اللغة المفضلة", value: user.locale ?? "-" },
          { label: "تاريخ التسجيل", value: formatDate(user.createdAt) },
          { label: "آخر تسجيل دخول", value: formatDate(user.lastLoginAt) },
          { label: "الأدوار", value: (user.roles ?? []).length > 0
            ? (user.roles ?? []).map((r, i) => {
                const role = r.role ?? r;
                return (
                  <span key={i} className="me-1.5 inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-bold text-ink-strong">
                    {typeof role === "object" && role !== null ? String((role as AnyRecord).name ?? "") : String(r.roleId ?? "")}
                  </span>
                );
              })
            : <span className="text-ink-muted">بدون أدوار</span>
          },
        ]}
      />

      {canWrite ? (
        <SectionCard
          title="إدارة حساب البائع"
          description="إيقاف أو إعادة تنشيط حساب هذا البائع. يؤثر على إمكانية دخوله للمنصة."
        >
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={updateStatus.isPending}
              onClick={() =>
                setPendingStatus({
                  status: nextStatus,
                  title: nextStatus === "SUSPENDED" ? "إيقاف حساب البائع" : "إعادة تنشيط حساب البائع",
                  confirmLabel: nextStatus === "SUSPENDED" ? "إيقاف الحساب" : "إعادة التنشيط",
                  variant: nextStatus === "SUSPENDED" ? "danger" : "success",
                  requireReason: nextStatus === "SUSPENDED",
                })
              }
              className={cn(
                nextStatus === "SUSPENDED"
                  ? "border-destructive/30 text-destructive hover:bg-destructive-soft"
                  : "border-success/30 text-success hover:bg-success-soft",
              )}
            >
              {nextStatus === "SUSPENDED" ? "إيقاف الحساب" : "إعادة تنشيط الحساب"}
            </Button>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title="متاجر البائع"
        description="المتاجر المسجلة تحت حساب هذا البائع. اضغط على اسم المتجر للانتقال لتفاصيله."
      >
        {storesQuery.isLoading ? (
          <LoadingState label="جار تحميل المتاجر" />
        ) : stores.length === 0 ? (
          <EmptyState
            title="لا توجد متاجر"
            description="لم يسجل هذا البائع أي متجر بعد."
          />
        ) : (
          <CursorDataTable
            data={stores}
            getRowKey={(store) => store.publicId}
            columns={[
              {
                id: "store",
                header: "المتجر",
                cell: (store) => (
                  <div>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/stores/${store.publicId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {localizedText(store.displayName, store.legalName ?? store.publicId, "ar")}
                      </Link>
                      <CopyButton value={store.publicId} />
                    </div>
                    <div className="text-xs text-ink-muted">{store.legalName ?? "-"}</div>
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
                  <span className="text-sm text-ink-strong">{store.storeType ?? "-"}</span>
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
                    <Link
                      href={`/stores/${store.publicId}`}
                      className="rounded-md border border-primary/30 px-2.5 py-1 text-xs font-bold text-primary transition hover:bg-primary/10"
                    >
                      تفاصيل المتجر
                    </Link>
                    {canNotify ? (
                      <button
                        type="button"
                        onClick={() =>
                          setNotifyTarget({
                            vendorId: store.publicId,
                            vendorName: localizedText(store.displayName, store.legalName ?? store.publicId, "ar"),
                          })
                        }
                        className="rounded-md border border-border px-2.5 py-1 text-xs font-bold text-ink-strong transition hover:bg-muted"
                      >
                        إشعار
                      </button>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        )}
      </SectionCard>

      <SectionCard
        title="آخر الطلبات"
        description="الطلبات المرتبطة بهذا البائع عبر متاجره."
      >
        {ordersQuery.isLoading ? (
          <LoadingState label="جار تحميل الطلبات" />
        ) : ordersQuery.isError ? (
          <p className="text-xs text-ink-muted">تعذر تحميل الطلبات أو أن الخدمة غير متاحة حالياً.</p>
        ) : orders.length === 0 ? (
          <EmptyState
            title="لا توجد طلبات"
            description="لم تسجل أي طلبات من قبل هذا البائع بعد."
          />
        ) : (
          <CursorDataTable
            data={orders}
            getRowKey={(row) => String(row.publicId ?? row.id ?? JSON.stringify(row))}
            columns={[
              {
                id: "order",
                header: "الطلب",
                cell: (row) => (
                  <Link
                    className="font-medium text-primary hover:underline"
                    href={`/orders/${String(row.publicId ?? row.id)}`}
                  >
                    {String(row.publicId ?? row.id ?? "-")}
                  </Link>
                ),
              },
              {
                id: "status",
                header: "الحالة",
                cell: (row) => <StatusBadge status={String(row.status ?? "UNKNOWN")} />,
              },
              {
                id: "payment",
                header: "الدفع",
                cell: (row) => <StatusBadge status={String(row.paymentStatus ?? "UNKNOWN")} />,
              },
              {
                id: "total",
                header: "الإجمالي",
                cell: (row) => formatMoney(row.totalCents, String(row.currency ?? "EGP")),
              },
              {
                id: "date",
                header: "التاريخ",
                cell: (row) => formatDate(row.placedAt ?? row.createdAt),
              },
            ]}
          />
        )}
      </SectionCard>

      <ActionDialog
        open={Boolean(pendingStatus)}
        title={pendingStatus?.title ?? ""}
        description={
          pendingStatus
            ? `${pendingStatus.status === "SUSPENDED" ? "سيتم إيقاف" : "سيتم إعادة تنشيط"} حساب ${user.email ?? user.publicId}.`
            : ""
        }
        confirmLabel={pendingStatus?.confirmLabel ?? ""}
        variant={pendingStatus?.variant ?? "success"}
        requireReason={pendingStatus?.requireReason ?? false}
        reasonLabel="سبب الإيقاف"
        reasonPlaceholder="اكتب سبب إيقاف حساب البائع لتسجيله في سجل التدقيق"
        disabled={updateStatus.isPending}
        onCancel={() => setPendingStatus(null)}
        onConfirm={(reason) => {
          if (!pendingStatus) return;
          updateStatus.mutate(
            { status: pendingStatus.status, reason },
            { onSettled: () => setPendingStatus(null) },
          );
        }}
      />

      {notifyTarget ? (
        <VendorNotifyDialog
          open={true}
          vendorName={notifyTarget.vendorName}
          disabled={false}
          onCancel={() => setNotifyTarget(null)}
          onConfirm={(payload) => {
            adminApi(adminPaths.vendorNotify(notifyTarget.vendorId), {
              method: "POST",
              body: payload,
            })
              .then(() => {
                toast.success("تم إرسال الإشعار بنجاح");
                setNotifyTarget(null);
              })
              .catch((error) => {
                toast.error(error instanceof Error ? error.message : "تعذر إرسال الإشعار");
              });
          }}
        />
      ) : null}
    </div>
  );
}
