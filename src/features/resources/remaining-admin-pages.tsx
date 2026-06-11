"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { EntityEditorDrawer, type EditorField } from "@/components/forms/entity-editor-drawer";
import { PageHeader } from "@/components/layout/page-header";
import { BackendPendingNotice } from "@/components/state/backend-pending-notice";
import { EmptyState, ErrorState, LoadingState } from "@/components/state/async-states";
import { StatusBadge } from "@/components/status/status-badge";
import { AlertItem } from "@/components/ui/alert-item";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { FormField, FormInput, FormSelect } from "@/components/ui/form-field";
import { SectionCard } from "@/components/ui/section-card";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { ImageUploadInput } from "@/components/image-upload-input";
import { formatDate, formatMoney, localizedText, formatName, roleLabel } from "@/lib/formatters";
import { ClickableImageWithFileFallback } from "@/components/clickable-image-fallback";
import { AuditLogDiffSection } from "@/features/audit-logs/audit-log-diff-section";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

type AnyRecord = Record<string, unknown>;

function text(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return localizedText(value, fallback, "ar");
  return String(value);
}

function i18nValue(value: unknown, locale: "ar" | "en"): string {
  if (!value) return "";
  if (typeof value === "object") {
    const val = value as Record<string, unknown>;
    return String(val[locale] ?? val.ar ?? val.en ?? "");
  }
  return String(value);
}

function stableRowKey(row: AnyRecord) {
  const stableValue = row.publicId ?? row.id ?? row.key ?? row.slug ?? row.code ?? row.email ?? row.name;
  if (stableValue !== undefined && stableValue !== null && stableValue !== "") {
    return String(stableValue);
  }

  return JSON.stringify(row);
}

function idOf(row: AnyRecord) {
  return stableRowKey(row);
}

function toArray(payload: unknown) {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (payload && typeof payload === "object") {
    const record = payload as { data?: unknown };
    if (Array.isArray(record.data)) return record.data as AnyRecord[];
  }
  return [];
}

function GapCard({ title, description }: { title: string; description: string }) {
  return (
    <AlertItem
      severity="warning"
      className="rounded-2xl p-5"
      title={title}
      description={description}
    />
  );
}

function TextInput({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <FormField label={label} required={required}>
      {(props) => (
        <FormInput
          {...props}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          placeholder={placeholder}
        />
      )}
    </FormField>
  );
}

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

function userRoleId(role: unknown) {
  if (!role || typeof role !== "object") return undefined;
  const record = role as Record<string, unknown>;
  if (typeof record.roleId === "number") return record.roleId;
  if (record.role && typeof record.role === "object") {
    const nested = record.role as Record<string, unknown>;
    if (typeof nested.id === "number") return nested.id;
  }
  return undefined;
}

const userEditSchema = z.object({
  firstName: z.string().trim().optional().or(z.literal("")),
  lastName: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("بريد إلكتروني غير صالح").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  locale: z.string().trim().optional().or(z.literal("")),
});

type UserEditValues = z.infer<typeof userEditSchema>;

export function UserDetailPage({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { confirm, element: confirmElement } = useConfirmDialog();
  const [roleId, setRoleId] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const userQuery = useQuery({
    queryKey: ["users", userId],
    queryFn: () => adminApi<AnyRecord>(`/api/admin/admin/users/${userId}`),
  });

  const ordersQuery = useQuery({
    queryKey: ["users", userId, "orders"],
    queryFn: () => adminApi<unknown>(`/api/admin/admin/users/${userId}/orders?limit=10`),
  });

  const verificationsQuery = useQuery({
    queryKey: ["users", userId, "verifications"],
    queryFn: () => adminApi<AnyRecord[]>(`/api/admin/admin/users/${userId}/verifications`),
  });

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: () => adminApi<AnyRecord[]>("/api/admin/roles"),
  });

  const updateStatus = useMutation({
    mutationFn: (status: "ACTIVE" | "SUSPENDED") =>
      adminApi(`/api/admin/admin/users/${userId}/status`, {
        method: "PATCH",
        body: { status },
      }),
    onSuccess: async () => {
      toast.success("تم تحديث حالة المستخدم بنجاح");
      await queryClient.invalidateQueries({ queryKey: ["users", userId] });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث حالة المستخدم");
    },
  });

  const updateUser = useMutation({
    mutationFn: (values: UserEditValues) => {
      const body: Record<string, unknown> = {};
      if (values.firstName) body.firstName = values.firstName;
      if (values.lastName) body.lastName = values.lastName;
      if (values.email) body.email = values.email;
      if (values.phone) body.phone = values.phone;
      if (values.locale) body.locale = values.locale;
      return adminApi(adminPaths.adminUserDetail(userId), {
        method: "PATCH",
        body,
      });
    },
    onSuccess: async () => {
      toast.success("تم تحديث بيانات المستخدم");
      await queryClient.invalidateQueries({ queryKey: ["users", userId] });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث المستخدم");
    },
  });

  const deleteUser = useMutation({
    mutationFn: () =>
      adminApi(adminPaths.adminUserDetail(userId), { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("تم حذف المستخدم");
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      router.push("/admins");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر حذف المستخدم");
    },
  });

  const assignRole = useMutation({
    mutationFn: (targetUserId: number) =>
      adminApi("/api/admin/roles/assign", {
        method: "POST",
        body: { userId: targetUserId, roleId: Number(roleId) },
      }),
    onSuccess: async () => {
      toast.success("تم تعيين الدور بنجاح");
      setRoleId("");
      await queryClient.invalidateQueries({ queryKey: ["users", userId] });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تعيين الدور");
    },
  });

  const revokeRole = useMutation({
    mutationFn: ({ targetUserId, nextRoleId }: { targetUserId: number; nextRoleId: number }) =>
      adminApi(`/api/admin/roles/users/${targetUserId}/roles/${nextRoleId}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      toast.success("تم حذف الدور بنجاح");
      await queryClient.invalidateQueries({ queryKey: ["users", userId] });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر حذف الدور");
    },
  });

  const user = userQuery.data;
  const ordersPayload = ordersQuery.data;
  const orders = toArray(ordersPayload);
  const verifications = verificationsQuery.data ?? [];
  const roles = rolesQuery.data ?? [];

  if (userQuery.isLoading) return <LoadingState label="جار تحميل بيانات المستخدم" />;
  if (userQuery.isError) return <ErrorState message={userQuery.error.message} />;
  if (!user) return <EmptyState title="المستخدم غير موجود" description="لم نتمكن من العثور على هذا المستخدم." />;

  const nextStatus = user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`ملف المستخدم: ${formatName(user)}`}
        description="عرض وتحديث بيانات الحساب والأدوار وسجل الطلبات والتحقق."
        actions={
          <Link href="/admins" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">
            كل المسؤولين
          </Link>
        }
      />

      <DetailGrid
        rows={[
          { label: "المعرف العام", value: text(user.publicId) },
          { label: "المعرف الداخلي", value: text(user.id) },
          { label: "البريد الإلكتروني", value: text(user.email) },
          { label: "رقم الهاتف", value: text(user.phone) },
          { label: "الحالة", value: <StatusBadge status={text(user.status, "UNKNOWN")} /> },
          { label: "اللغة المفضلة", value: text(user.locale) },
          { label: "تاريخ التسجيل", value: formatDate(user.createdAt) },
          { label: "آخر تسجيل دخول", value: formatDate(user.lastLoginAt) },
        ]}
      />

      <SectionCard
        title="إدارة الحساب"
        description="إيقاف أو إعادة تنشيط حساب المستخدم في النظام."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
              تعديل البيانات
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={updateStatus.isPending}
              onClick={async () => {
                const result = await confirm({
                  title:
                    nextStatus === "SUSPENDED" ? "إيقاف المستخدم" : "إعادة تنشيط المستخدم",
                  description: `سيتم ${nextStatus === "SUSPENDED" ? "إيقاف" : "إعادة تنشيط"} ${user.email ?? user.publicId}.`,
                  confirmLabel: nextStatus === "SUSPENDED" ? "إيقاف" : "إعادة تنشيط",
                  variant: nextStatus === "SUSPENDED" ? "danger" : "success",
                  requireReason: nextStatus === "SUSPENDED",
                  reasonLabel: "سبب الإيقاف",
                });
                if (result.confirmed) updateStatus.mutate(nextStatus);
              }}
            >
              {nextStatus === "SUSPENDED" ? "إيقاف الحساب" : "تنشيط الحساب"}
            </Button>
            <Button
              type="button"
              variant="outline-danger"
              disabled={deleteUser.isPending}
              onClick={async () => {
                const result = await confirm({
                  title: "حذف المستخدم نهائياً",
                  description: `سيتم حذف حساب ${user.email ?? user.publicId}. هذا الإجراء حساس وقد لا يمكن التراجع عنه.`,
                  confirmLabel: "حذف الحساب",
                  variant: "danger",
                  requireReason: true,
                  reasonLabel: "سبب الحذف",
                });
                if (result.confirmed) deleteUser.mutate();
              }}
            >
              حذف الحساب
            </Button>
          </div>
        }
      />

      <SectionCard
        title="أدوار المستخدم الصالحة"
        description="الأدوار الممنوحة لهذا المستخدم على مستوى النظام."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {((user.roles as AnyRecord[]) ?? []).map((role: AnyRecord, index: number) => {
              const label = roleLabel(role);
              const id = userRoleId(role);
              return (
                <span
                  key={`${label}-${index}`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-bold text-ink-strong"
                >
                  {label}
                  {id && label !== "ADMIN" ? (
                    <button
                      type="button"
                      disabled={revokeRole.isPending}
                      onClick={() => revokeRole.mutate({ targetUserId: Number(user.id), nextRoleId: id })}
                      className="font-bold text-ink-soft transition hover:text-destructive"
                      title="حذف الدور"
                    >
                      ×
                    </button>
                  ) : null}
                </span>
              );
            })}
            {((user.roles as AnyRecord[]) ?? []).length === 0 ? (
              <span className="text-xs text-ink-muted">لا توجد أدوار معينة حالياً (مستخدم عادي).</span>
            ) : null}
          </div>

          <div className="flex max-w-sm items-center gap-2">
            <FormField label="اختر دوراً" className="flex-1">
              {(props) => (
                <FormSelect
                  {...props}
                  value={roleId}
                  onChange={(event) => setRoleId(event.target.value)}
                  className="h-9 text-xs"
                >
                  <option value="">اختر دوراً لتعيينه...</option>
                  {roles.map((role) => (
                    <option key={String(role.id)} value={String(role.id)}>
                      {String(role.name ?? "")}
                    </option>
                  ))}
                </FormSelect>
              )}
            </FormField>
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={!roleId || assignRole.isPending}
              onClick={() => assignRole.mutate(Number(user.id))}
            >
              إسناد
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="وثائق التحقق والـ KYC"
        description="الطلبات والمستندات المقدمة للتحقق من الهوية."
      >
        {verificationsQuery.isLoading ? (
          <LoadingState label="جار تحميل الوثائق" />
        ) : verificationsQuery.isError ? (
          <ErrorState message={verificationsQuery.error.message} />
        ) : verifications.length === 0 ? (
          <p className="text-xs text-ink-muted">لم يقدم هذا المستخدم أي وثائق تحقق بعد.</p>
        ) : (
          <CursorDataTable
            data={verifications}
            getRowKey={(row) => String(row.id)}
            columns={[
              {
                id: "document",
                header: "الوثيقة",
                cell: (row) => (
                  <div>
                    <div className="font-medium text-ink-strong">{text(row.documentType)}</div>
                    <div className="text-xs text-ink-muted">{text(row.documentNumber)}</div>
                  </div>
                ),
              },
              {
                id: "status",
                header: "الحالة",
                cell: (row) => <StatusBadge status={String(row.status ?? "")} />,
              },
              {
                id: "dates",
                header: "التواريخ",
                cell: (row) => (
                  <div className="text-xs text-ink-strong">
                    <div>تم الإرسال {formatDate(row.createdAt)}</div>
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
                        <ClickableImageWithFileFallback src={String(row.fileUrl)} alt="الملف الرئيسي" className="h-full w-full object-cover" fallbackLabel="الملف الرئيسي" />
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
            ]}
          />
        )}
      </SectionCard>

      <SectionCard
        title="آخر الطلبات"
        description="الطلبات التي تم إنشاؤها بواسطة هذا المستخدم."
      >
        {ordersQuery.isLoading ? (
          <LoadingState label="جار تحميل الطلبات" />
        ) : ordersQuery.isError ? (
          <ErrorState message={ordersQuery.error.message} />
        ) : orders.length === 0 ? (
          <p className="text-xs text-ink-muted">لا توجد طلبات سابقة لهذا المستخدم.</p>
        ) : (
          <CursorDataTable
            data={orders}
            getRowKey={(row) => idOf(row)}
            columns={[
              {
                id: "order",
                header: "الطلب",
                cell: (row) => (
                  <Link className="font-medium text-primary hover:underline" href={`/orders/${idOf(row)}`}>
                    {text(row.publicId)}
                  </Link>
                ),
              },
              { id: "status", header: "الحالة", cell: (row) => <StatusBadge status={text(row.status, "UNKNOWN")} /> },
              { id: "payment", header: "الدفع", cell: (row) => <StatusBadge status={text(row.paymentStatus, "UNKNOWN")} /> },
              { id: "total", header: "الإجمالي", cell: (row) => formatMoney(row.totalCents, text(row.currency, "EGP")) },
              { id: "date", header: "التاريخ", cell: (row) => formatDate(row.placedAt ?? row.createdAt) },
            ]}
          />
        )}
      </SectionCard>
      {confirmElement}
      <EntityEditorDrawer<UserEditValues>
        open={editOpen}
        onOpenChange={setEditOpen}
        title="تعديل بيانات المستخدم"
        description="حدّث الاسم وبيانات التواصل واللغة المفضلة."
        schema={userEditSchema}
        pending={updateUser.isPending}
        defaultValues={{
          firstName: text(user.firstName, ""),
          lastName: text(user.lastName, ""),
          email: text(user.email, ""),
          phone: text(user.phone, ""),
          locale: text(user.locale, ""),
        }}
        fields={[
          { name: "firstName", label: "الاسم الأول" },
          { name: "lastName", label: "اسم العائلة" },
          { name: "email", label: "البريد الإلكتروني", kind: "email", dir: "ltr", colSpan: 2 },
          { name: "phone", label: "رقم الهاتف", kind: "tel", dir: "ltr" },
          {
            name: "locale",
            label: "اللغة المفضلة",
            kind: "select",
            options: [
              { value: "", label: "بدون تحديد" },
              { value: "ar", label: "العربية" },
              { value: "en", label: "English" },
            ],
          },
        ]}
        onSubmit={(values) => updateUser.mutate(values)}
      />
    </div>
  );
}

export function BulkOrderDetailPage({ bulkOrderId }: { bulkOrderId: string }) {
  const bulkOrder = useQuery({
    queryKey: ["/api/admin/bulk/orders", bulkOrderId],
    queryFn: () => adminApi<AnyRecord>(`/api/admin/bulk/orders/${bulkOrderId}`),
  });
  const row = bulkOrder.data;
  const items = Array.isArray(row?.items) ? row.items as AnyRecord[] : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`تفاصيل طلب الجملة ${bulkOrderId}`}
        description="تفتيش طلبات الجملة المتاحة من endpoint المشتري الحالي، مع توضيح فجوات الإدارة."
        actions={
          <Link href="/bulk-orders" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">
            طلبات الجملة
          </Link>
        }
      />
      {bulkOrder.isLoading ? (
        <LoadingState label="جار تحميل طلب الجملة" />
      ) : bulkOrder.isError ? (
        <ErrorState message={bulkOrder.error.message} />
      ) : row ? (
        <>
          <DetailGrid rows={[
            { label: "المعرف", value: text(row.publicId) },
            { label: "الحالة", value: <StatusBadge status={text(row.status, "UNKNOWN")} /> },
            { label: "الدفع", value: <StatusBadge status={text(row.paymentStatus, "UNKNOWN")} /> },
            { label: "الإجمالي", value: formatMoney(row.totalCents, text(row.currency, "EGP")) },
            { label: "تاريخ الإنشاء", value: formatDate(row.createdAt) },
            { label: "آخر تحديث", value: formatDate(row.updatedAt) },
          ]} />
          <SectionCard title="العناصر">
            <CursorDataTable
              data={items}
              getRowKey={(item) => idOf(item)}
              columns={[
                {
                  id: "product",
                  header: "المنتج",
                  cell: (item) => (
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                          <ClickableImageWithFileFallback src={String(item.imageUrl)} alt={localizedText((item.product as AnyRecord | undefined)?.title, "منتج", "ar")} className="h-full w-full object-cover" noWrapper={true} />
                        </div>
                      ) : null}
                      <div>
                        <div className="text-ink-strong">{localizedText((item.product as AnyRecord | undefined)?.title, text(item.productId), "ar")}</div>
                        {Boolean(item.variantName) ? (
                          <div className="text-xs text-ink-muted">
                            {localizedText(item.variantName, "", "ar")}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                },
                { id: "qty", header: "الكمية", cell: (item) => text(item.quantity, "0") },
                { id: "price", header: "السعر", cell: (item) => formatMoney(item.unitPriceCents, text(row.currency, "EGP")) },
                { id: "total", header: "الإجمالي", cell: (item) => formatMoney(item.totalCents, text(row.currency, "EGP")) },
              ]}
            />
          </SectionCard>
          <GapCard
            title="إجراءات الإدارة لطلبات الجملة تحتاج endpoints إدارية"
            description="العرض الحالي يعتمد على /v1/bulk/orders/:orderId. تحديث الحالة، الوفاء، والملاحظات من الإدارة تحتاج /v1/admin/bulk-orders/:bulkOrderId وما يتبعها."
          />
        </>
      ) : null}
    </div>
  );
}

export function RefundDetailPage({ refundId }: { refundId: string }) {
  const refund = useQuery({
    queryKey: ["/api/admin/admin/refunds", refundId],
    queryFn: () => adminApi<AnyRecord>(adminPaths.adminRefundDetail(refundId)),
  });
  const row = refund.data;
  const payment = (row?.payment as AnyRecord | undefined) ?? undefined;
  const currency = text(row?.currency ?? payment?.currency, "EGP");
  const createdBy = row?.createdBy as AnyRecord | undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`تفاصيل الاسترداد ${refundId}`}
        description="عرض بيانات طلب الاسترداد والمدفوعة المرتبطة به."
        actions={
          <Link href="/refunds" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">
            كل الاستردادات
          </Link>
        }
      />
      {refund.isLoading ? (
        <LoadingState label="جار تحميل الاسترداد" />
      ) : refund.isError ? (
        <ErrorState message={refund.error.message} />
      ) : row ? (
        <DetailGrid rows={[
          { label: "المعرف", value: text(row.publicId) },
          { label: "الحالة", value: <StatusBadge status={text(row.status, "UNKNOWN")} /> },
          { label: "المبلغ", value: formatMoney(row.amountCents, currency) },
          { label: "السبب", value: text(row.reason) },
          { label: "المدفوعة المرتبطة", value: payment ? <Link className="font-medium text-primary hover:underline" href={`/payments/${text(payment.publicId)}`}>{text(payment.publicId)}</Link> : "-" },
          { label: "البوابة", value: text(row.gateway ?? payment?.gateway) },
          { label: "مرجع البوابة", value: text(row.gatewayRefundId ?? row.gatewayTransactionId) },
          { label: "بواسطة", value: text(createdBy?.email) },
          { label: "تاريخ الإنشاء", value: formatDate(row.createdAt) },
        ]} />
      ) : null}
    </div>
  );
}

export function CatalogBrandsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const brands = useQuery({
    queryKey: ["/api/admin/brands"],
    queryFn: () => adminApi<unknown>("/api/admin/brands?limit=50"),
  });
  const createBrand = useMutation({
    mutationFn: () => adminApi("/api/admin/brands", { method: "POST", body: { name: { ar: name, en: name }, slug, isActive: true } }),
    onSuccess: async () => {
      toast.success("تم إنشاء العلامة التجارية");
      setName("");
      setSlug("");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/brands"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر إنشاء العلامة"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="العلامات التجارية"
        description="إنشاء وتحديث العلامات التجارية في الكتالوج."
        actions={
          <Link href="/catalog" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">
            الكتالوج
          </Link>
        }
      />
      <SectionCard title="إضافة علامة تجارية">
        <form onSubmit={(event) => { event.preventDefault(); createBrand.mutate(); }} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <TextInput label="الاسم" value={name} onChange={setName} required />
          <TextInput label="Slug" value={slug} onChange={setSlug} required />
          <Button type="submit" variant="primary" disabled={createBrand.isPending}>حفظ</Button>
        </form>
      </SectionCard>
      {brands.isLoading ? <LoadingState /> : brands.isError ? <ErrorState message={brands.error.message} /> : (
        <CursorDataTable
          data={toArray(brands.data)}
          getRowKey={(brand) => idOf(brand)}
          columns={[
            { id: "name", header: "الاسم", cell: (brand) => <Link href={`/catalog/brands/${idOf(brand)}`} className="font-medium text-primary hover:underline">{localizedText(brand.name, text(brand.slug), "ar")}</Link> },
            { id: "slug", header: "Slug", cell: (brand) => text(brand.slug) },
            { id: "status", header: "الحالة", cell: (brand) => <StatusBadge status={brand.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
            { id: "date", header: "التاريخ", cell: (brand) => formatDate(brand.createdAt) },
          ]}
        />
      )}
    </div>
  );
}

export function BrandDetailPage({ brandId }: { brandId: string }) {
  return <SimpleCatalogDetail entityId={brandId} kind="brand" title="العلامة التجارية" basePath="/api/admin/brands" backHref="/catalog/brands" />;
}

export function CatalogStoreCategoriesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const list = useQuery({
    queryKey: ["/api/admin/store-categories"],
    queryFn: () => adminApi<AnyRecord[]>("/api/admin/store-categories"),
  });
  const create = useMutation({
    mutationFn: () => adminApi("/api/admin/store-categories", { method: "POST", body: { name: { ar: name, en: name }, slug, isActive: true } }),
    onSuccess: async () => {
      toast.success("تم إنشاء تصنيف المتجر");
      setName("");
      setSlug("");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/store-categories"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر إنشاء تصنيف المتجر"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="تصنيفات المتاجر"
        description="إدارة تصنيفات واجهات البائعين."
        actions={
          <Link href="/catalog" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">
            الكتالوج
          </Link>
        }
      />
      <SectionCard title="إضافة تصنيف متجر">
        <form onSubmit={(event) => { event.preventDefault(); create.mutate(); }} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <TextInput label="الاسم" value={name} onChange={setName} required />
          <TextInput label="Slug" value={slug} onChange={setSlug} required />
          <Button type="submit" variant="primary" disabled={create.isPending}>حفظ</Button>
        </form>
      </SectionCard>
      {list.isLoading ? <LoadingState /> : list.isError ? <ErrorState message={list.error.message} /> : (
        <CursorDataTable
          data={list.data ?? []}
          getRowKey={(item) => idOf(item)}
          columns={[
            { id: "name", header: "الاسم", cell: (item) => <Link href={`/catalog/store-categories/${idOf(item)}`} className="font-medium text-primary hover:underline">{localizedText(item.name, text(item.slug), "ar")}</Link> },
            { id: "slug", header: "Slug", cell: (item) => text(item.slug) },
            { id: "status", header: "الحالة", cell: (item) => <StatusBadge status={item.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
            { id: "date", header: "التاريخ", cell: (item) => formatDate(item.createdAt) },
          ]}
        />
      )}
    </div>
  );
}

export function StoreCategoryDetailPage({ storeCategoryId }: { storeCategoryId: string }) {
  return <SimpleCatalogDetail entityId={storeCategoryId} kind="storeCategory" title="تصنيف المتجر" basePath="/api/admin/store-categories" backHref="/catalog/store-categories" />;
}

function SimpleCatalogDetail({
  entityId,
  title,
  basePath,
  backHref,
}: {
  entityId: string;
  kind: "brand" | "storeCategory";
  title: string;
  basePath: string;
  backHref: string;
}) {
  const queryClient = useQueryClient();
  const { confirm, element: confirmElement } = useConfirmDialog();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isActive, setIsActive] = useState("true");
  const detail = useQuery({
    queryKey: [basePath, entityId],
    queryFn: () => adminApi<AnyRecord>(`${basePath}/${entityId}`),
  });
  useEffect(() => {
    if (!detail.data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(localizedText(detail.data.name, "", "ar"));
    setSlug(text(detail.data.slug, ""));
    setIsActive(detail.data.isActive === false ? "false" : "true");
  }, [detail.data]);
  const update = useMutation({
    mutationFn: () => adminApi(`${basePath}/${entityId}`, { method: "PATCH", body: { name: name ? { ar: name, en: name } : undefined, slug: slug || undefined, isActive: isActive === "true" } }),
    onSuccess: async () => {
      toast.success("تم الحفظ");
      await queryClient.invalidateQueries({ queryKey: [basePath, entityId] });
      await queryClient.invalidateQueries({ queryKey: [basePath] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر الحفظ"),
  });
  const remove = useMutation({
    mutationFn: () => adminApi(`${basePath}/${entityId}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("تم الحذف");
      await queryClient.invalidateQueries({ queryKey: [basePath] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر الحذف"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${title} ${entityId}`}
        description="تحديث بيانات الكتالوج وحالة الظهور."
        actions={
          <Link href={backHref} className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">
            رجوع
          </Link>
        }
      />
      {detail.isLoading ? <LoadingState /> : detail.isError ? <ErrorState message={detail.error.message} /> : (
        <>
          <DetailGrid rows={[
            { label: "المعرف", value: text(detail.data?.publicId) },
            { label: "Slug", value: text(detail.data?.slug) },
            { label: "الحالة", value: <StatusBadge status={detail.data?.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
            { label: "تاريخ الإنشاء", value: formatDate(detail.data?.createdAt) },
          ]} />
          <SectionCard title="تعديل البيانات">
            <form onSubmit={(event) => { event.preventDefault(); update.mutate(); }} className="grid gap-3 md:grid-cols-3">
              <TextInput label="الاسم" value={name} onChange={setName} required />
              <TextInput label="Slug" value={slug} onChange={setSlug} required />
              <FormField label="نشط؟" required>
                {(props) => (
                  <FormSelect {...props} value={isActive} onChange={(e) => setIsActive(e.target.value)}>
                    <option value="true">نشط</option>
                    <option value="false">غير نشط</option>
                  </FormSelect>
                )}
              </FormField>
              <div className="flex gap-2 md:col-span-3">
                <Button type="submit" variant="primary" disabled={update.isPending}>حفظ</Button>
                <Button
                  type="button"
                  variant="outline-danger"
                  disabled={remove.isPending}
                  onClick={async () => {
                    const result = await confirm({
                      title: "حذف العنصر",
                      description: "سيتم حذف هذا العنصر نهائياً. هذا الإجراء لا يمكن التراجع عنه.",
                      confirmLabel: "حذف",
                      variant: "danger",
                      requireReason: true,
                      reasonLabel: "سبب الحذف",
                    });
                    if (result.confirmed) remove.mutate();
                  }}
                >
                  حذف
                </Button>
              </div>
            </form>
          </SectionCard>
        </>
      )}
      {confirmElement}
    </div>
  );
}

export function CatalogAttributesIndexPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="خصائص التصنيفات" description="تدار الخصائص من صفحة كل تصنيف حتى تبقى مربوطة بسياقها الصحيح." />
      <EmptyState title="اختر تصنيفا من الكتالوج" description="افتح /catalog ثم اضغط على أي تصنيف لإضافة خصائصه أو تعديلها أو حذفها." />
      <Link href="/catalog" className="inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5">
        فتح الكتالوج
      </Link>
    </div>
  );
}

export function PromotionCreatePage() {
  return <PromotionEditorPage mode="create" />;
}

export function PromotionDetailPage({ promotionId }: { promotionId: string }) {
  return <PromotionEditorPage mode="edit" promotionId={promotionId} />;
}

function PromotionEditorPage({ mode, promotionId }: { mode: "create" | "edit"; promotionId?: string }) {
  const queryClient = useQueryClient();
  const { confirm, element: confirmElement } = useConfirmDialog();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [valueBps, setValueBps] = useState("1000");
  const [validUntil, setValidUntil] = useState("");
  const detail = useQuery({
    queryKey: ["/api/admin/admin/promotions", promotionId],
    queryFn: () => adminApi<AnyRecord>(`/api/admin/admin/promotions/${promotionId}`),
    enabled: mode === "edit" && Boolean(promotionId),
  });
  useEffect(() => {
    if (!detail.data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCode(text(detail.data.code, ""));
    setName(localizedText(detail.data.name, "", "ar"));
    setStatus(text(detail.data.status, "ACTIVE"));
    setValueBps(text(detail.data.valueBps, "1000"));
    setValidUntil(detail.data.validUntil ? new Date(String(detail.data.validUntil)).toISOString().slice(0, 16) : "");
  }, [detail.data]);
  const save = useMutation({
    mutationFn: () => {
      const body = {
        code: code || undefined,
        name: { ar: name, en: name },
        discountType: "PERCENTAGE",
        scope: "PLATFORM",
        valueBps: Number(valueBps),
        validFrom: detail.data?.validFrom ? String(detail.data.validFrom) : new Date().toISOString(),
        validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
        status,
      };
      return adminApi(`/api/admin/admin/promotions${mode === "edit" ? `/${promotionId}` : ""}`, { method: mode === "edit" ? "PATCH" : "POST", body });
    },
    onSuccess: async () => {
      toast.success("تم حفظ العرض");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/admin/promotions"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر حفظ العرض"),
  });
  const remove = useMutation({
    mutationFn: () => adminApi(`/api/admin/admin/promotions/${promotionId}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("تم حذف العرض");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/admin/promotions"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر حذف العرض"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === "create" ? "إنشاء عرض" : `تفاصيل العرض ${promotionId}`}
        description="إنشاء وتعديل كوبونات المنصة."
        actions={
          <Link href="/promotions" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">
            العروض
          </Link>
        }
      />
      {detail.isLoading ? <LoadingState /> : detail.isError ? <ErrorState message={detail.error.message} /> : (
        <SectionCard title="بيانات العرض">
          <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="grid gap-3 md:grid-cols-3">
            <TextInput label="الكود" value={code} onChange={setCode} />
            <TextInput label="الاسم" value={name} onChange={setName} required />
            <TextInput label="الحالة" value={status} onChange={setStatus} required placeholder="ACTIVE / DRAFT / CANCELLED" />
            <TextInput label="النسبة BPS" value={valueBps} onChange={setValueBps} required />
            <TextInput label="ينتهي في" value={validUntil} onChange={setValidUntil} placeholder="YYYY-MM-DDTHH:mm" />
            <div className="flex items-end gap-2">
              <Button type="submit" variant="primary" disabled={save.isPending}>حفظ</Button>
              {mode === "edit" ? (
                <Button
                  type="button"
                  variant="outline-danger"
                  disabled={remove.isPending}
                  onClick={async () => {
                    const result = await confirm({
                      title: "حذف العرض",
                      description: "سيتم حذف هذا العرض نهائياً. هذا الإجراء لا يمكن التراجع عنه.",
                      confirmLabel: "حذف",
                      variant: "danger",
                      requireReason: true,
                      reasonLabel: "سبب الحذف",
                    });
                    if (result.confirmed) remove.mutate();
                  }}
                >
                  حذف
                </Button>
              ) : null}
            </div>
          </form>
        </SectionCard>
      )}
      {confirmElement}
    </div>
  );
}

export function BannerCreatePage() {
  return <BannerEditorPage mode="create" />;
}

export function BannerDetailPage({ bannerId }: { bannerId: string }) {
  return <BannerEditorPage mode="edit" bannerId={bannerId} />;
}

function BannerEditorPage({ mode, bannerId }: { mode: "create" | "edit"; bannerId?: string }) {
  const queryClient = useQueryClient();
  const { confirm, element: confirmElement } = useConfirmDialog();
  const [imageFileId, setImageFileId] = useState("");
  const [title, setTitle] = useState("");
  const [position, setPosition] = useState("HOME_HERO");
  const [linkTarget, setLinkTarget] = useState("");
  const [isActive, setIsActive] = useState("true");
  const detail = useQuery({
    queryKey: ["/api/admin/admin/banners", bannerId],
    queryFn: () => adminApi<AnyRecord>(`/api/admin/admin/banners/${bannerId}`),
    enabled: mode === "edit" && Boolean(bannerId),
  });
  useEffect(() => {
    if (!detail.data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageFileId(text(detail.data.imageFileId, ""));
    setTitle(localizedText(detail.data.title, "", "ar"));
    setPosition(text(detail.data.position, "HOME_HERO"));
    setLinkTarget(text(detail.data.linkTarget, ""));
    setIsActive(detail.data.isActive === false ? "false" : "true");
  }, [detail.data]);
  const save = useMutation({
    mutationFn: () => adminApi(`/api/admin/admin/banners${mode === "edit" ? `/${bannerId}` : ""}`, {
      method: mode === "edit" ? "PATCH" : "POST",
      body: { imageFileId, title: { ar: title, en: title }, position, linkTarget: linkTarget || undefined, isActive: isActive === "true" },
    }),
    onSuccess: async () => {
      toast.success("تم حفظ البانر");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/admin/banners"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر حفظ البانر"),
  });
  const remove = useMutation({
    mutationFn: () => adminApi(`/api/admin/admin/banners/${bannerId}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("تم حذف البانر");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/admin/banners"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر حذف البانر"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === "create" ? "إنشاء بانر" : `تفاصيل البانر ${bannerId}`}
        description="إدارة بانرات الحملات والصفحة الرئيسية."
        actions={
          <Link href="/banners" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">
            البانرات
          </Link>
        }
      />
      {detail.isLoading ? <LoadingState /> : detail.isError ? <ErrorState message={detail.error.message} /> : (
        <SectionCard title="بيانات البانر">
          <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="العنوان" value={title} onChange={setTitle} required />
              <FormField label="الموضع">
                {(props) => (
                  <FormSelect {...props} value={position} onChange={(e) => setPosition(e.target.value)}>
                    <option value="HOME_HERO">HOME_HERO</option>
                    <option value="HOME_STRIP">HOME_STRIP</option>
                    <option value="CATEGORY_HEADER">CATEGORY_HEADER</option>
                    <option value="CATEGORIES_FEATURED">CATEGORIES_FEATURED</option>
                  </FormSelect>
                )}
              </FormField>
              <TextInput label="الرابط" value={linkTarget} onChange={setLinkTarget} />
              <FormField label="نشط؟">
                {(props) => (
                  <FormSelect {...props} value={isActive} onChange={(e) => setIsActive(e.target.value)}>
                    <option value="true">نشط (Active)</option>
                    <option value="false">غير نشط (Inactive)</option>
                  </FormSelect>
                )}
              </FormField>
            </div>

            <ImageUploadInput label="صورة البانر" value={imageFileId} onChange={setImageFileId} purpose="BANNER_IMAGE" required />

            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={save.isPending || !imageFileId}>حفظ</Button>
              {mode === "edit" ? (
                <Button
                  type="button"
                  variant="outline-danger"
                  disabled={remove.isPending}
                  onClick={async () => {
                    const result = await confirm({
                      title: "حذف البانر",
                      description: "سيتم حذف هذا البانر نهائياً. هذا الإجراء لا يمكن التراجع عنه.",
                      confirmLabel: "حذف",
                      variant: "danger",
                      requireReason: true,
                      reasonLabel: "سبب الحذف",
                    });
                    if (result.confirmed) remove.mutate();
                  }}
                >
                  حذف
                </Button>
              ) : null}
            </div>
          </form>
        </SectionCard>
      )}
      {confirmElement}
    </div>
  );
}

export function ShippingZonesPage() {
  return <ShippingEntityPage type="zones" title="مناطق الشحن" />;
}

export function ShippingMethodsPage() {
  return <ShippingEntityPage type="methods" title="طرق الشحن" />;
}

const zoneFormSchema = z.object({
  name: z.object({
    ar: z.string().trim().min(1, "الاسم العربي مطلوب"),
    en: z.string().trim().optional().or(z.literal("")),
  }),
  code: z.string().trim().min(1, "الكود مطلوب"),
  countryId: z.string().trim().min(1, "رمز الدولة مطلوب"),
  cityId: z.string().trim().optional().or(z.literal("")),
  isActive: z.string().default("true"),
});

const methodFormSchema = z.object({
  name: z.object({
    ar: z.string().trim().min(1, "الاسم العربي مطلوب"),
    en: z.string().trim().optional().or(z.literal("")),
  }),
  code: z.string().trim().min(1, "الكود مطلوب"),
  scope: z.string().trim().min(1, "النطاق مطلوب"),
  etaMinDays: z.coerce.number().min(0, "الحد الأدنى للأيام يجب أن يكون 0 أو أكثر"),
  etaMaxDays: z.coerce.number().min(0, "الحد الأقصى للأيام يجب أن يكون 0 أو أكثر"),
  isActive: z.string().default("true"),
});

const zoneFormFields: EditorField<AnyRecord>[] = [
  { name: "name.ar", label: "الاسم (عربي)", required: true },
  { name: "name.en", label: "الاسم (إنجليزي)", dir: "ltr" },
  { name: "code", label: "الكود (مثال: EG-CAI)", required: true, dir: "ltr" },
  { name: "countryId", label: "رمز الدولة (مثال: EG)", required: true, dir: "ltr" },
  { name: "cityId", label: "رمز المدينة (اختياري - مثال: CAI)", dir: "ltr" },
  {
    name: "isActive",
    label: "الحالة",
    kind: "select",
    options: [
      { value: "true", label: "نشط" },
      { value: "false", label: "غير نشط" },
    ],
    required: true,
  },
];

const methodFormFields: EditorField<AnyRecord>[] = [
  { name: "name.ar", label: "الاسم (عربي)", required: true },
  { name: "name.en", label: "الاسم (إنجليزي)", dir: "ltr" },
  { name: "code", label: "الكود (مثال: EXPRESS)", required: true, dir: "ltr" },
  {
    name: "scope",
    label: "النطاق",
    kind: "select",
    options: [
      { value: "NATIONAL", label: "محلي / وطني" },
      { value: "INTERNATIONAL", label: "دولية" },
    ],
    required: true,
  },
  { name: "etaMinDays", label: "الحد الأدنى للوصول (أيام)", kind: "number", required: true },
  { name: "etaMaxDays", label: "الحد الأقصى للوصول (أيام)", kind: "number", required: true },
  {
    name: "isActive",
    label: "الحالة",
    kind: "select",
    options: [
      { value: "true", label: "نشط" },
      { value: "false", label: "غير نشط" },
    ],
    required: true,
  },
];

function ShippingEntityPage({ type, title }: { type: "zones" | "methods"; title: string }) {
  const queryClient = useQueryClient();
  const { confirm, element: confirmElement } = useConfirmDialog();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<AnyRecord | null>(null);

  const listPath = `/api/admin/shipping/${type}`;
  const adminPath = `/api/admin/shipping/admin/${type}`;
  const rows = useQuery({ queryKey: [listPath], queryFn: () => adminApi<AnyRecord[]>(listPath) });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminApi(`${adminPath}/${id}`, { method: "PATCH", body: { isActive } }),
    onSuccess: async () => {
      toast.success("تم تحديث الشحن");
      await queryClient.invalidateQueries({ queryKey: [listPath] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر تحديث الشحن"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi(`${adminPath}/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("تم الحذف");
      await queryClient.invalidateQueries({ queryKey: [listPath] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر الحذف"),
  });

  const upsert = useMutation({
    mutationFn: (values: AnyRecord) => {
      const isEdit = Boolean(selectedRow);
      const url = isEdit
        ? `${adminPath}/${idOf(selectedRow!)}`
        : adminPath;
      
      const body: Record<string, unknown> = {
        name: values.name,
        code: values.code,
        isActive: values.isActive === "true",
      };

      if (type === "zones") {
        body.countryId = values.countryId;
        body.cityId = values.cityId || null;
      } else {
        body.scope = values.scope;
        body.etaMinDays = Number(values.etaMinDays);
        body.etaMaxDays = Number(values.etaMaxDays);
      }

      return adminApi(url, {
        method: isEdit ? "PATCH" : "POST",
        body,
      });
    },
    onSuccess: async () => {
      toast.success(selectedRow ? "تم تحديث عنصر الشحن بنجاح" : "تم إنشاء عنصر الشحن بنجاح");
      setDrawerOpen(false);
      setSelectedRow(null);
      await queryClient.invalidateQueries({ queryKey: [listPath] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ عنصر الشحن");
    },
  });

  const handleEdit = (row: AnyRecord) => {
    setSelectedRow(row);
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setSelectedRow(null);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description="تحديث حالة عناصر الشحن وإضافتها وتعديلها وحذفها."
        actions={
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleCreate}>
              <Plus className="me-1 size-4" />
              إضافة
            </Button>
            <Link href="/shipping" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">
              الشحن
            </Link>
          </div>
        }
      />
      {rows.isLoading ? <LoadingState /> : rows.isError ? <ErrorState message={rows.error.message} /> : (
        <CursorDataTable
          data={rows.data ?? []}
          getRowKey={(row) => idOf(row)}
          columns={[
            { id: "name", header: "الاسم", cell: (row) => <div><div className="font-medium text-ink-strong">{localizedText(row.name, text(row.code), "ar")}</div><div className="text-xs text-ink-muted">{text(row.code ?? row.scope)}</div></div> },
            { id: "detail", header: "التفاصيل", cell: (row) => type === "zones" ? `دولة ${text(row.countryId)} / مدينة ${text(row.cityId)}` : `${text(row.etaMinDays, "0")} - ${text(row.etaMaxDays, "0")} يوم` },
            { id: "status", header: "الحالة", cell: (row) => <StatusBadge status={row.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
            { id: "actions", header: "إجراء", cell: (row) => (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleEdit(row)}
                >
                  <Pencil className="me-1 size-3.5" />
                  تعديل
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => toggle.mutate({ id: idOf(row), isActive: row.isActive === false })}
                >
                  {row.isActive === false ? "تفعيل" : "تعطيل"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline-danger"
                  onClick={async () => {
                    const result = await confirm({
                      title: "حذف العنصر",
                      description: "سيتم حذف هذا العنصر نهائياً. هذا الإجراء لا يمكن التراجع عنه.",
                      confirmLabel: "حذف",
                      variant: "danger",
                      requireReason: true,
                      reasonLabel: "سبب الحذف",
                    });
                    if (result.confirmed) remove.mutate(idOf(row));
                  }}
                >
                  حذف
                </Button>
              </div>
            ) },
          ]}
        />
      )}
      {confirmElement}

      <EntityEditorDrawer<AnyRecord>
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={selectedRow ? `تعديل ${title}` : `إضافة ${title}`}
        description="يرجى ملء الحقول أدناه لحفظ التعديلات."
        schema={type === "zones" ? zoneFormSchema : methodFormSchema}
        pending={upsert.isPending}
        defaultValues={{
          name: {
            ar: i18nValue(selectedRow?.name, "ar"),
            en: i18nValue(selectedRow?.name, "en"),
          },
          code: selectedRow?.code ?? "",
          countryId: selectedRow?.countryId ?? "EG",
          cityId: selectedRow?.cityId ?? "",
          scope: selectedRow?.scope ?? "NATIONAL",
          etaMinDays: selectedRow?.etaMinDays ?? 1,
          etaMaxDays: selectedRow?.etaMaxDays ?? 3,
          isActive: selectedRow?.isActive === false ? "false" : "true",
        }}
        fields={type === "zones" ? zoneFormFields : methodFormFields}
        onSubmit={(values) => {
          upsert.mutate(values);
        }}
      />
    </div>
  );
}

export function ShippingVendorRatesPage() {
  const [vendorId, setVendorId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [methodId, setMethodId] = useState("");
  const [baseCents, setBaseCents] = useState("0");
  const queryClient = useQueryClient();
  const rates = useQuery({
    queryKey: ["/api/admin/vendors", vendorId, "shipping-rates"],
    queryFn: () => adminApi<AnyRecord[]>(`/api/admin/vendors/${vendorId}/shipping-rates`),
    enabled: Boolean(vendorId),
  });
  const upsert = useMutation({
    mutationFn: () => adminApi(`/api/admin/vendors/${vendorId}/shipping-rates`, { method: "POST", body: { zoneId, methodId, rateType: "FLAT", baseCents: Number(baseCents), isActive: true } }),
    onSuccess: async () => {
      toast.success("تم حفظ سعر الشحن");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/vendors", vendorId, "shipping-rates"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر حفظ سعر الشحن"),
  });
  return (
    <div className="space-y-6">
      <PageHeader title="أسعار شحن البائعين" description="عرض وإضافة أسعار الشحن للبائع عند توفر صلاحية الإدارة/البائع." />
      <SectionCard title="إضافة سعر جديد">
        <form onSubmit={(event) => { event.preventDefault(); upsert.mutate(); }} className="grid gap-3 md:grid-cols-5 md:items-end">
          <TextInput label="معرف البائع" value={vendorId} onChange={setVendorId} required />
          <TextInput label="معرف المنطقة" value={zoneId} onChange={setZoneId} required />
          <TextInput label="معرف الطريقة" value={methodId} onChange={setMethodId} required />
          <TextInput label="السعر بالقروش" value={baseCents} onChange={setBaseCents} required />
          <Button type="submit" variant="primary" disabled={!vendorId || upsert.isPending}>حفظ</Button>
        </form>
      </SectionCard>
      {!vendorId ? <EmptyState title="أدخل معرف بائع" description="بعد إدخال معرف البائع ستظهر أسعار الشحن الخاصة به." /> : rates.isLoading ? <LoadingState /> : rates.isError ? <ErrorState message={rates.error.message} /> : (
        <CursorDataTable
          data={rates.data ?? []}
          getRowKey={(rate) => idOf(rate)}
          columns={[
            { id: "zone", header: "المنطقة", cell: (rate) => text((rate.zone as AnyRecord | undefined)?.publicId ?? rate.zoneId) },
            { id: "method", header: "الطريقة", cell: (rate) => text((rate.method as AnyRecord | undefined)?.code ?? rate.methodId) },
            { id: "amount", header: "السعر", cell: (rate) => formatMoney(rate.baseCents, "EGP") },
            { id: "status", header: "الحالة", cell: (rate) => <StatusBadge status={rate.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
          ]}
        />
      )}
    </div>
  );
}

export function ShippingQuoteTesterPage() {
  const [addressId, setAddressId] = useState("");
  const quote = useMutation({
    mutationFn: () => adminApi<unknown>("/api/admin/shipping/quote", { method: "POST", body: { addressId } }),
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر حساب الشحن"),
  });
  return (
    <div className="space-y-6">
      <PageHeader title="اختبار تسعير الشحن" description="اختبار endpoint /v1/shipping/quote بعنوان موجود." />
      <SectionCard title="حساب سعر الشحن">
        <form onSubmit={(event) => { event.preventDefault(); quote.mutate(); }} className="flex flex-col items-end gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <TextInput label="معرف العنوان" value={addressId} onChange={setAddressId} required />
          </div>
          <Button type="submit" variant="primary" disabled={quote.isPending}>احسب</Button>
        </form>
      </SectionCard>
      {quote.data ? <CodeBlock>{JSON.stringify(quote.data, null, 2)}</CodeBlock> : null}
    </div>
  );
}

export function BillingGapPage({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <PageHeader title={title} description="وحدة مالية جاهزة للتوصيل عند اكتمال endpoints الفوترة الإدارية العامة." />
      <BackendPendingNotice
        endpoint="GET /v1/admin/vendor-billing/accounts"
        priority="P1"
        description="الخلفية الحالية توفر بيانات الفوترة بنطاق البائع فقط، وتوفر للإدارة مراجعة دفعة وتشغيل مهمة الفوترة. هذه الصفحة تحتاج endpoint إداري عام حسب النوع."
      />
      <Link href="/billing" className="inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5">
        فتح إجراءات الفوترة المتاحة
      </Link>
    </div>
  );
}

export function OpsHealthPage() {
  const health = useQuery({ queryKey: ["/api/system/health"], queryFn: () => adminApi<unknown>("/api/system/health") });
  const ready = useQuery({ queryKey: ["/api/system/health/ready"], queryFn: () => adminApi<unknown>("/api/system/health/ready") });
  const metrics = useQuery({ queryKey: ["/api/system/metrics"], queryFn: () => adminApi<unknown>("/api/system/metrics") });
  return (
    <div className="space-y-6">
      <PageHeader title="صحة النظام" description="فحوصات الصحة والمقاييس من endpoints خارج /v1 عبر proxy محمي." />
      <section className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="الصحة">
          {health.isLoading ? <LoadingState /> : health.isError ? <ErrorState message={health.error.message} /> : <CodeBlock>{JSON.stringify(health.data, null, 2)}</CodeBlock>}
        </SectionCard>
        <SectionCard title="الجاهزية">
          {ready.isLoading ? <LoadingState /> : ready.isError ? <ErrorState message={ready.error.message} /> : <CodeBlock>{JSON.stringify(ready.data, null, 2)}</CodeBlock>}
        </SectionCard>
        <SectionCard title="المقاييس">
          {metrics.isLoading ? <LoadingState /> : metrics.isError ? <ErrorState message={metrics.error.message} /> : (
            <pre dir="ltr" className="max-h-96 overflow-auto whitespace-pre-wrap text-xs text-ink-strong">{String(metrics.data ?? "")}</pre>
          )}
        </SectionCard>
      </section>
    </div>
  );
}

export function OpsQueuesPage() {
  const queues = useQuery({ queryKey: ["/api/admin/admin/ops/queues"], queryFn: () => adminApi<AnyRecord>("/api/admin/admin/ops/queues") });
  const rows = queues.data ? Object.entries(queues.data).map(([name, value]) => ({ name, value })) : [];
  return (
    <div className="space-y-6">
      <PageHeader title="طوابير النظام" description="متابعة حالة طوابير BullMQ." />
      {queues.isLoading ? <LoadingState /> : queues.isError ? <ErrorState message={queues.error.message} /> : (
        <CursorDataTable
          data={rows}
          getRowKey={(row) => row.name}
          columns={[
            { id: "name", header: "الطابور", cell: (row) => row.name },
            { id: "value", header: "الحالة", cell: (row) => <pre dir="ltr" className="max-w-xl overflow-auto text-xs text-ink-strong">{JSON.stringify(row.value, null, 2)}</pre> },
          ]}
        />
      )}
    </div>
  );
}

export function OpsGapPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-4">
      <PageHeader title={title} description={description} />
      <GapCard title="Endpoint غير متاح بعد" description="هذه الصفحة جاهزة في لوحة الإدارة، لكنها تحتاج endpoint backend لإرجاع البيانات أو تشغيل الإجراء المطلوب." />
    </div>
  );
}

export function AuditLogDetailPage({ auditLogId }: { auditLogId: string }) {
  return (
    <div className="space-y-4">
      <PageHeader
        title={`تفاصيل سجل التدقيق ${auditLogId}`}
        description="تفاصيل العملية والقيم قبل وبعد التعديل."
      />
      <AuditLogDiffSection auditLogId={auditLogId} />
    </div>
  );
}

export function AuditExportPage() {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [action, setAction] = useState("");
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const url = adminPaths.auditLogsExport({
        format,
        from: from || undefined,
        to: to || undefined,
        action: action || undefined,
      });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const message = res.status === 401
          ? "انتهت الجلسة، يرجى تسجيل الدخول من جديد."
          : `تعذر التصدير (HTTP ${res.status}).`;
        toast.error(message);
        return;
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
      toast.success("تم بدء تنزيل الملف");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر التصدير");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="تصدير سجل التدقيق" description="نزّل سجلات التدقيق بصيغة CSV أو JSON مع إمكانية التصفية بالتاريخ والإجراء." />
      <SectionCard title="خيارات التصدير" description="حدد النطاق الزمني والصيغة ثم ابدأ التنزيل.">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="الصيغة">
            {(props) => (
              <FormSelect {...props} value={format} onChange={(e) => setFormat(e.target.value as "csv" | "json")}>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </FormSelect>
            )}
          </FormField>
          <FormField label="الإجراء (اختياري)" hint="مثال: vendor.suspended">
            {(props) => (
              <FormInput {...props} dir="ltr" placeholder="كل الإجراءات" value={action} onChange={(e) => setAction(e.target.value)} />
            )}
          </FormField>
          <FormField label="من تاريخ (اختياري)">
            {(props) => (
              <FormInput {...props} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            )}
          </FormField>
          <FormField label="إلى تاريخ (اختياري)">
            {(props) => (
              <FormInput {...props} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            )}
          </FormField>
        </div>
        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={download} disabled={downloading}>
            {downloading ? "جار التحضير..." : "تنزيل الملف"}
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
