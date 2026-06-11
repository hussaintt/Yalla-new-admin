"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

import { ClickableImageWithFileFallback } from "@/components/clickable-image-fallback";
import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { ImageUploadInput } from "@/components/image-upload-input";
import { PageHeader } from "@/components/layout/page-header";
import { ActionDialog } from "@/components/modals/action-dialog";
import { BackendPendingNotice } from "@/components/state/backend-pending-notice";
import { TableSkeleton } from "@/components/state/table-skeleton";
import { EmptyState, ErrorState, LoadingState } from "@/components/state/async-states";
import { StatusBadge } from "@/components/status/status-badge";
import { AlertItem } from "@/components/ui/alert-item";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { FormField, FormInput, FormSelect } from "@/components/ui/form-field";
import { Progress } from "@/components/ui/progress";
import { SectionCard } from "@/components/ui/section-card";
import { Switch } from "@/components/ui/switch";
import { adminApi } from "@/lib/api/admin-client";
import type { CursorPage } from "@/lib/api/pagination";
import { adminPaths, withQuery } from "@/lib/api/paths";
import { formatDate, formatMoney, localizedText } from "@/lib/formatters";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

type AnyRecord = Record<string, unknown>;

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
] as const;

const ORDER_SPLIT_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "ON_THE_WAY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
] as const;

function text(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return localizedText(value, fallback, "ar");
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

function BackendGapCard({ title, description }: { title: string; description: string }) {
  return (
    <AlertItem
      severity="warning"
      className="rounded-2xl p-5"
      title={title}
      description={description}
    />
  );
}

function ResourceList<T extends AnyRecord>({
  title,
  description,
  path,
  query,
  columns,
  emptyTitle = "لا توجد بيانات",
  normalize,
}: {
  title: string;
  description: string;
  path: string;
  query?: Record<string, string | undefined>;
  columns: Array<{ id: string; header: React.ReactNode; cell: (row: T) => React.ReactNode }>;
  emptyTitle?: string;
  normalize?: (payload: unknown) => T[] | CursorPage<T>;
}) {
  const [cursor, setCursor] = useState<string | undefined>();
  const params = { limit: "20", cursor, ...(query ?? {}) };
  const url = withQuery(path, params);
  const list = useQuery({
    queryKey: [path, params],
    queryFn: () => adminApi<unknown>(url),
  });

  const result = useMemo(() => {
    if (!list.data) return { data: [] as T[], hasMore: false, nextCursor: null };
    const normalized = normalize?.(list.data);
    if (Array.isArray(normalized)) {
      return { data: normalized, hasMore: false, nextCursor: null };
    }
    if (normalized) return normalized;
    if (Array.isArray(list.data)) return { data: list.data as T[], hasMore: false, nextCursor: null };
    const page = list.data as CursorPage<T>;
    return { data: page.data ?? [], hasMore: page.hasMore, nextCursor: page.nextCursor };
  }, [list.data, normalize]);

  return (
    <div className="space-y-4">
      <PageHeader title={title} description={description} />
      {list.isLoading ? (
        <TableSkeleton />
      ) : list.isError ? (
        <ErrorState message={list.error.message} />
      ) : result.data.length === 0 ? (
        <EmptyState title={emptyTitle} description="لا توجد عناصر مطابقة حاليا." />
      ) : (
        <>
          <CursorDataTable data={result.data} getRowKey={(row) => idOf(row)} columns={columns} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!cursor}
              onClick={() => setCursor(undefined)}
            >
              الأولى
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!result.hasMore || !result.nextCursor}
              onClick={() => setCursor(result.nextCursor ?? undefined)}
            >
              التالي
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
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

export function OrdersPage() {
  const [status, setStatus] = useState("");
  return (
    <div className="space-y-4">
      <PageHeader title="الطلبات" description="متابعة طلبات التجزئة وحالات الدفع والتسليم." />
      <FormField label="حالة الطلب">
        {(props) => (
          <FormSelect
            {...props}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="md:max-w-sm"
          >
            <option value="">كل الحالات</option>
            {["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </FormSelect>
        )}
      </FormField>
      <ResourceList<AnyRecord>
        title=""
        description=""
        path="/api/admin/admin/orders"
        query={{ status: status || undefined }}
        columns={[
          {
            id: "order",
            header: "الطلب",
            cell: (row) => (
              <div className="flex items-center gap-1">
                <Link className="font-medium text-primary hover:underline" href={`/orders/${idOf(row)}`}>
                  {text(row.publicId)}
                </Link>
                <CopyButton value={text(row.publicId)} />
              </div>
            )
          },
          { id: "status", header: "الحالة", cell: (row) => <StatusBadge status={text(row.status, "UNKNOWN")} /> },
          { id: "payment", header: "الدفع", cell: (row) => <StatusBadge status={text(row.paymentStatus, "UNKNOWN")} /> },
          { id: "total", header: "الإجمالي", cell: (row) => formatMoney(row.totalCents, text(row.currency, "EGP")) },
          { id: "date", header: "التاريخ", cell: (row) => formatDate(row.placedAt ?? row.createdAt) },
        ]}
      />
    </div>
  );
}

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const { confirm, element: confirmElement } = useConfirmDialog();
  const [nextStatus, setNextStatus] = useState<string>("");

  const order = useQuery({
    queryKey: ["/api/admin/admin/orders", orderId],
    queryFn: () => adminApi<AnyRecord>(`/api/admin/admin/orders/${orderId}`),
  });
  const payments = useQuery({
    queryKey: ["/api/admin/orders", orderId, "payments"],
    queryFn: () => adminApi<AnyRecord[]>(`/api/admin/orders/${orderId}/payments`),
    retry: false,
  });
  const events = useQuery({
    queryKey: ["/api/admin/admin/orders", orderId, "events"],
    queryFn: () => adminApi<unknown>(adminPaths.adminOrderEvents(orderId)),
    retry: false,
  });
  const row = order.data;
  const items = Array.isArray(row?.items) ? row.items as AnyRecord[] : [];
  const splits = Array.isArray(row?.splits) ? row.splits as AnyRecord[] : Array.isArray(row?.orderSplits) ? row.orderSplits as AnyRecord[] : [];
  const currentStatus = text(row?.status, "");

  const refreshOrder = () =>
    Promise.all([order.refetch(), events.refetch()]);

  const statusMutation = useMutation({
    mutationFn: (body: { status: string; reason?: string }) =>
      adminApi(adminPaths.adminOrderStatus(orderId), { method: "PATCH", body }),
    onSuccess: async () => {
      toast.success("تم تحديث حالة الطلب");
      await refreshOrder();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الحالة"),
  });

  const cancelMutation = useMutation({
    mutationFn: (body: { reason?: string }) =>
      adminApi(adminPaths.adminOrderCancel(orderId), { method: "POST", body }),
    onSuccess: async () => {
      toast.success("تم إلغاء الطلب");
      await refreshOrder();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "تعذر إلغاء الطلب"),
  });

  const splitStatusMutation = useMutation({
    mutationFn: ({ splitId, status, reason }: { splitId: string; status: string; reason?: string }) =>
      adminApi(adminPaths.adminOrderSplitStatus(splitId), {
        method: "PATCH",
        body: { status, reason },
      }),
    onSuccess: async () => {
      toast.success("تم تحديث حالة التقسيم");
      await order.refetch();
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/admin/orders", orderId] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "تعذر تحديث التقسيم"),
  });

  const pending = statusMutation.isPending || cancelMutation.isPending;

  const applyStatus = async () => {
    if (!nextStatus || nextStatus === currentStatus) return;
    const result = await confirm({
      title: "تغيير حالة الطلب",
      description: `سيتم تغيير حالة الطلب إلى «${nextStatus}». يمكنك إضافة سبب اختياري.`,
      confirmLabel: "تأكيد التغيير",
      requireReason: false,
      reasonLabel: "السبب (اختياري)",
    });
    if (result.confirmed) {
      statusMutation.mutate({ status: nextStatus, reason: result.reason });
    }
  };

  const cancelOrder = async () => {
    const result = await confirm({
      title: "إلغاء الطلب",
      description: "سيتم إلغاء هذا الطلب إدارياً. هذا الإجراء قد يؤثر على البائعين والمدفوعات.",
      confirmLabel: "إلغاء الطلب",
      variant: "danger",
      requireReason: true,
      reasonLabel: "سبب الإلغاء",
    });
    if (result.confirmed) {
      cancelMutation.mutate({ reason: result.reason });
    }
  };

  const changeSplitStatus = async (splitId: string, status: string, current: string) => {
    if (!status || status === current) return;
    const result = await confirm({
      title: "تغيير حالة تقسيم البائع",
      description: `سيتم تغيير حالة هذا التقسيم إلى «${status}».`,
      confirmLabel: "تأكيد",
      requireReason: false,
      reasonLabel: "السبب (اختياري)",
    });
    if (result.confirmed) {
      splitStatusMutation.mutate({ splitId, status, reason: result.reason });
    }
  };

  return (
    <div className="space-y-6">
      {confirmElement}
      <PageHeader
        title={`تفاصيل الطلب ${orderId}`}
        description="عرض بيانات الطلب، العناصر، المدفوعات، وتقسيمات البائعين، وإدارة الحالة."
        actions={
          <Link href="/orders" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">
            كل الطلبات
          </Link>
        }
      />
      {order.isLoading ? (
        <LoadingState label="جار تحميل الطلب" />
      ) : order.isError ? (
        <ErrorState message={order.error.message} />
      ) : row ? (
        <>
          <DetailGrid rows={[
            { label: "المعرف", value: <div className="flex items-center gap-1"><span>{text(row.publicId)}</span><CopyButton value={text(row.publicId)} /></div> },
            { label: "الحالة", value: <StatusBadge status={text(row.status, "UNKNOWN")} /> },
            { label: "الدفع", value: <StatusBadge status={text(row.paymentStatus, "UNKNOWN")} /> },
            { label: "الإجمالي", value: formatMoney(row.totalCents, text(row.currency, "EGP")) },
            { label: "المشتري", value: text((row.user as AnyRecord | undefined)?.email ?? (row.customer as AnyRecord | undefined)?.email) },
            { label: "تاريخ الطلب", value: formatDate(row.placedAt ?? row.createdAt) },
          ]} />
          <SectionCard
            title="عناصر الطلب"
            description="تفاصيل كل منتج مدرج في هذا الطلب."
          >
            <CursorDataTable data={items} getRowKey={(item) => idOf(item)} columns={[
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
              { id: "vendor", header: "البائع", cell: (item) => localizedText((item.vendor as AnyRecord | undefined)?.displayName, text(item.vendorId), "ar") },
              { id: "qty", header: "الكمية", cell: (item) => text(item.quantity, "0") },
              { id: "price", header: "السعر", cell: (item) => formatMoney(item.unitPriceCents ?? item.priceCents, text(row.currency, "EGP")) },
              { id: "total", header: "الإجمالي", cell: (item) => formatMoney(item.totalCents, text(row.currency, "EGP")) },
            ]} />
          </SectionCard>
          <SectionCard
            title="مدفوعات الطلب"
            description="كل المدفوعات التي تمت على هذا الطلب."
          >
            {payments.isLoading ? <LoadingState label="جار تحميل المدفوعات" /> : payments.isError ? <ErrorState message={payments.error.message} /> : (
              <CursorDataTable data={payments.data ?? []} getRowKey={(payment) => idOf(payment)} columns={[
                { id: "id", header: "الدفع", cell: (payment) => <Link href={`/payments/${idOf(payment)}`} className="font-medium text-primary hover:underline">{text(payment.publicId)}</Link> },
                { id: "status", header: "الحالة", cell: (payment) => <StatusBadge status={text(payment.status, "UNKNOWN")} /> },
                { id: "gateway", header: "البوابة", cell: (payment) => text(payment.gateway) },
                { id: "amount", header: "المبلغ", cell: (payment) => formatMoney(payment.amountCents, text(payment.currency, "EGP")) },
              ]} />
            )}
          </SectionCard>
          <SectionCard title="تقسيمات البائعين" description="غيّر حالة تقسيم أي بائع مباشرة.">
            <CursorDataTable data={splits} getRowKey={(split) => idOf(split)} columns={[
              { id: "vendor", header: "البائع", cell: (split) => localizedText((split.vendor as AnyRecord | undefined)?.displayName, text(split.vendorId), "ar") },
              { id: "status", header: "الحالة", cell: (split) => <StatusBadge status={text(split.status, "UNKNOWN")} /> },
              { id: "fulfillment", header: "الوفاء", cell: (split) => <StatusBadge status={text(split.fulfillmentStatus, "UNKNOWN")} /> },
              { id: "amount", header: "المبلغ", cell: (split) => formatMoney(split.totalCents, text(row.currency, "EGP")) },
              {
                id: "actions",
                header: "تغيير الحالة",
                cell: (split) => {
                  const splitCurrent = text(split.status, "");
                  return (
                    <FormSelect
                      key={`${idOf(split)}-${splitCurrent}`}
                      defaultValue={splitCurrent}
                      disabled={splitStatusMutation.isPending}
                      className="h-9 w-44"
                      onChange={(e) => changeSplitStatus(idOf(split), e.target.value, splitCurrent)}
                    >
                      {ORDER_SPLIT_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </FormSelect>
                  );
                },
              },
            ]} />
          </SectionCard>

          <SectionCard title="إجراءات الطلب" description="حدّث حالة الطلب أو ألغِه إدارياً.">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-56">
                <FormField label="الحالة الجديدة">
                  {(props) => (
                    <FormSelect
                      {...props}
                      value={nextStatus || currentStatus}
                      disabled={pending}
                      onChange={(e) => setNextStatus(e.target.value)}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </FormSelect>
                  )}
                </FormField>
              </div>
              <Button
                type="button"
                onClick={applyStatus}
                disabled={pending || !nextStatus || nextStatus === currentStatus}
              >
                تطبيق الحالة
              </Button>
              <Button
                type="button"
                variant="outline-danger"
                onClick={cancelOrder}
                disabled={pending || currentStatus === "CANCELLED"}
              >
                إلغاء الطلب
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="الخط الزمني للطلب" description="سجل الأحداث والتغييرات على هذا الطلب.">
            {events.isLoading ? (
              <LoadingState label="جار تحميل الأحداث" />
            ) : events.isError ? (
              <ErrorState message={events.error.message} />
            ) : (() => {
              const rawEvents = events.data as AnyRecord | AnyRecord[] | undefined;
              const list = Array.isArray(rawEvents)
                ? rawEvents
                : Array.isArray((rawEvents as AnyRecord | undefined)?.data)
                  ? ((rawEvents as AnyRecord).data as AnyRecord[])
                  : Array.isArray((rawEvents as AnyRecord | undefined)?.events)
                    ? ((rawEvents as AnyRecord).events as AnyRecord[])
                    : [];
              if (list.length === 0) {
                return <EmptyState title="لا توجد أحداث" description="لم يتم تسجيل أحداث لهذا الطلب بعد." />;
              }
              return (
                <ol className="relative space-y-4 border-s-2 border-border ps-5">
                  {list.map((event, index) => (
                    <li key={idOf(event) + index} className="relative">
                      <span className="absolute -start-[1.45rem] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-primary-soft" />
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={text(event.type ?? event.action ?? event.status, "EVENT")} />
                        <span className="text-xs text-ink-muted">{formatDate(event.createdAt ?? event.at ?? event.timestamp)}</span>
                      </div>
                      {Boolean(event.message ?? event.description ?? event.note) ? (
                        <p className="mt-1 text-sm text-ink-strong">{text(event.message ?? event.description ?? event.note)}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              );
            })()}
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}

export function BulkOrdersPage() {
  return (
    <ResourceList<AnyRecord>
      title="طلبات الجملة"
      description="عرض طلبات الجملة الحالية. إجراءات الإدارة المتقدمة تحتاج نقاط /v1/admin/bulk-orders."
      path="/api/admin/bulk/orders"
      columns={[
        {
          id: "order",
          header: "الطلب",
          cell: (row) => (
            <div className="flex items-center gap-1">
              <Link href={`/bulk-orders/${idOf(row)}`} className="font-medium text-primary hover:underline">
                {text(row.publicId)}
              </Link>
              <CopyButton value={text(row.publicId)} />
            </div>
          )
        },
        { id: "status", header: "الحالة", cell: (row) => <StatusBadge status={text(row.status, "UNKNOWN")} /> },
        { id: "payment", header: "الدفع", cell: (row) => <StatusBadge status={text(row.paymentStatus, "UNKNOWN")} /> },
        { id: "total", header: "الإجمالي", cell: (row) => formatMoney(row.totalCents, text(row.currency, "EGP")) },
        { id: "date", header: "التاريخ", cell: (row) => formatDate(row.createdAt) },
      ]}
    />
  );
}

export function PaymentsPage() {
  const queryClient = useQueryClient();
  const { confirm, element: confirmElement } = useConfirmDialog();
  const refund = useMutation({
    mutationFn: ({ paymentId, amountCents, reason }: { paymentId: string; amountCents?: number; reason?: string }) =>
      adminApi(`/api/admin/admin/payments/${paymentId}/refund`, {
        method: "POST",
        headers: { "Idempotency-Key": `admin-refund-${paymentId}-${Date.now()}` },
        body: { amountCents, reason },
      }),
    onSuccess: async () => {
      toast.success("تم إنشاء طلب الاسترداد");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/admin/payments"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر تنفيذ الاسترداد"),
  });

  return (
    <div className="space-y-4">
      <ResourceList<AnyRecord>
        title="المدفوعات والاسترداد"
        description="مراجعة المدفوعات وتنفيذ استرداد يدوي للمدفوعات المقبوضة."
        path="/api/admin/admin/payments"
        columns={[
          {
            id: "payment",
            header: "الدفع",
            cell: (row) => (
              <div>
                <div className="flex items-center gap-1">
                  <Link href={`/payments/${idOf(row)}`} className="font-medium text-primary hover:underline">
                    {text(row.publicId)}
                  </Link>
                  <CopyButton value={text(row.publicId)} />
                </div>
                <div className="text-xs text-ink-muted">{text(row.gateway)} · {text(row.method)}</div>
              </div>
            )
          },
          { id: "status", header: "الحالة", cell: (row) => <StatusBadge status={text(row.status, "UNKNOWN")} /> },
          { id: "amount", header: "المبلغ", cell: (row) => formatMoney(row.amountCents, text(row.currency, "EGP")) },
          { id: "refunded", header: "المسترد", cell: (row) => formatMoney(row.refundedAmountCents, text(row.currency, "EGP")) },
          { id: "date", header: "التاريخ", cell: (row) => formatDate(row.createdAt) },
          { id: "action", header: "إجراء", cell: (row) => (
            <Button
              type="button"
              size="sm"
              variant="outline-danger"
              disabled={refund.isPending}
              onClick={async () => {
                const result = await confirm({
                  title: "استرداد المدفوعة",
                  description: "سيتم إنشاء طلب استرداد لهذه المدفوعة. اكتب سبب الاسترداد ليظهر في سجل التدقيق.",
                  confirmLabel: "تنفيذ الاسترداد",
                  variant: "danger",
                  requireReason: true,
                  reasonLabel: "سبب الاسترداد",
                });
                if (result.confirmed) {
                  refund.mutate({ paymentId: idOf(row), reason: result.reason });
                }
              }}
            >
              استرداد
            </Button>
          ) },
        ]}
      />
      {confirmElement}
    </div>
  );
}

export function PaymentDetailPage({ paymentId }: { paymentId: string }) {
  const queryClient = useQueryClient();
  const [refundDialog, setRefundDialog] = useState<{ open: boolean; amount: string; reason: string }>({
    open: false,
    amount: "",
    reason: "",
  });
  const payment = useQuery({
    queryKey: ["/api/admin/payments", paymentId],
    queryFn: () => adminApi<AnyRecord>(`/api/admin/payments/${paymentId}`),
  });
  const refund = useMutation({
    mutationFn: ({ amountCents, reason }: { amountCents?: number; reason?: string }) =>
      adminApi(`/api/admin/admin/payments/${paymentId}/refund`, {
        method: "POST",
        headers: { "Idempotency-Key": `admin-refund-${paymentId}-${Date.now()}` },
        body: { amountCents, reason },
      }),
    onSuccess: async () => {
      toast.success("تم إنشاء الاسترداد");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/payments", paymentId] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/admin/payments"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر تنفيذ الاسترداد"),
  });

  const row = payment.data;
  const refunds = Array.isArray(row?.refunds) ? row.refunds as AnyRecord[] : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`تفاصيل الدفع ${paymentId}`}
        description="عرض حالة الدفع، بيانات البوابة، والاستردادات المرتبطة به."
        actions={
          <Link href="/payments" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">
            كل المدفوعات
          </Link>
        }
      />
      {payment.isLoading ? (
        <LoadingState label="جار تحميل الدفع" />
      ) : payment.isError ? (
        <ErrorState message={payment.error.message} />
      ) : row ? (
        <>
          <DetailGrid rows={[
            { label: "المعرف", value: text(row.publicId) },
            { label: "الحالة", value: <StatusBadge status={text(row.status, "UNKNOWN")} /> },
            { label: "المبلغ", value: formatMoney(row.amountCents, text(row.currency, "EGP")) },
            { label: "المسترد", value: formatMoney(row.refundedAmountCents, text(row.currency, "EGP")) },
            { label: "البوابة", value: text(row.gateway) },
            { label: "الطريقة", value: text(row.method) },
            { label: "الطلب", value: text(row.orderId ?? (row.order as AnyRecord | undefined)?.publicId) },
            { label: "معرف معاملة البوابة", value: text(row.gatewayTransactionId) },
            { label: "تاريخ الإنشاء", value: formatDate(row.createdAt) },
          ]} />
          <SectionCard
            title="الاستردادات"
            description="تظهر هنا الاستردادات التي تعيدها تفاصيل الدفع من الخلفية."
            actions={
              <Button
                type="button"
                size="sm"
                variant="outline-danger"
                disabled={refund.isPending}
                onClick={() => setRefundDialog({ open: true, amount: "", reason: "" })}
              >
                إنشاء استرداد
              </Button>
            }
          >
            <CursorDataTable
              data={refunds}
              getRowKey={(refundRow) => idOf(refundRow)}
              columns={[
                {
                  id: "id",
                  header: "الاسترداد",
                  cell: (refundRow) => (
                    <div className="flex items-center gap-1">
                      <Link href={`/refunds/${idOf(refundRow)}`} className="font-medium text-primary hover:underline">
                        {text(refundRow.publicId)}
                      </Link>
                      <CopyButton value={text(refundRow.publicId)} />
                    </div>
                  )
                },
                { id: "amount", header: "المبلغ", cell: (refundRow) => formatMoney(refundRow.amountCents, text(row.currency, "EGP")) },
                { id: "reason", header: "السبب", cell: (refundRow) => text(refundRow.reason) },
                { id: "date", header: "التاريخ", cell: (refundRow) => formatDate(refundRow.createdAt) },
              ]}
            />
          </SectionCard>
        </>
      ) : null}
      <ActionDialog
        open={refundDialog.open}
        title="إنشاء استرداد"
        description="حدد مبلغ الاسترداد (بالقروش) وسببه. اترك المبلغ فارغاً لاسترداد المبلغ المتبقي."
        confirmLabel="تنفيذ الاسترداد"
        variant="danger"
        requireReason
        disabled={refund.isPending}
        onCancel={() => setRefundDialog({ open: false, amount: "", reason: "" })}
        onConfirm={(reason) => {
          const amountCents = refundDialog.amount.trim()
            ? Number(refundDialog.amount.trim())
            : undefined;
          refund.mutate(
            { amountCents, reason },
            {
              onSettled: () =>
                setRefundDialog({ open: false, amount: "", reason: "" }),
            },
          );
        }}
      />
      <div className="space-y-2">
        <label className="block text-sm font-bold text-ink-strong">
          المبلغ بالقروش (اختياري)
          <input
            type="number"
            inputMode="numeric"
            value={refundDialog.amount}
            onChange={(event) =>
              setRefundDialog((prev) => ({ ...prev, amount: event.target.value }))
            }
            placeholder="اتركه فارغاً لاسترداد المتبقي"
            className="mt-2 h-11 w-full rounded-2xl border border-border bg-muted/40 px-3 text-sm text-ink-strong outline-none transition focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
          />
        </label>
      </div>
    </div>
  );
}

export function RefundsPage() {
  return (
    <ResourceList<AnyRecord>
      title="الاستردادات"
      description="متابعة طلبات الاسترداد المالي والسجل التاريخي."
      path="/api/admin/admin/refunds"
      columns={[
        {
          id: "refund",
          header: "معرف الاسترداد",
          cell: (row) => (
            <div className="flex items-center gap-1">
              <Link href={`/refunds/${idOf(row)}`} className="font-medium text-primary hover:underline">
                {text(row.publicId)}
              </Link>
              <CopyButton value={text(row.publicId)} />
            </div>
          )
        },
        { id: "amount", header: "المبلغ", cell: (row) => formatMoney(row.amountCents, text(row.currency, "EGP")) },
        { id: "reason", header: "السبب", cell: (row) => text(row.reason) },
        {
          id: "payment",
          header: "معرف الدفع المرتبط",
          cell: (row) => {
            const payment = row.payment as AnyRecord | undefined;
            return payment ? (
              <div className="flex items-center gap-1">
                <Link className="font-medium text-primary hover:underline" href={`/payments/${payment.publicId}`}>
                  {text(payment.publicId)}
                </Link>
                <CopyButton value={text(payment.publicId)} />
              </div>
            ) : "-";
          }
        },
        { id: "createdBy", header: "بواسطة", cell: (row) => { const createdBy = row.createdBy as AnyRecord | undefined; return text(createdBy?.email); } },
        { id: "date", header: "التاريخ", cell: (row) => formatDate(row.createdAt) },
      ]}
    />
  );
}

export function ProductsPage() {
  return (
    <ResourceList<AnyRecord>
      title="المنتجات"
      description="فحص المنتجات العامة، الأسعار، البائعين، ومؤشرات المخزون المتاحة من الخلفية."
      path="/api/admin/products"
      columns={[
        {
          id: "image",
          header: "الصورة",
          cell: (row) => {
            const imageUrl = String(row.defaultImageUrl ?? (Array.isArray(row.imageUrls) && row.imageUrls[0]) ?? "");
            return imageUrl ? (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                <ClickableImageWithFileFallback src={imageUrl} alt={localizedText(row.title, "Product", "ar")} className="h-full w-full object-cover" noWrapper={true} />
              </div>
            ) : (
              <span className="text-xs text-ink-soft">-</span>
            );
          }
        },
        { id: "product", header: "المنتج", cell: (row) => <Link className="font-medium text-primary hover:underline" href={`/products/${idOf(row)}`}>{localizedText(row.title, text(row.slug))}</Link> },
        { id: "status", header: "الحالة", cell: (row) => <StatusBadge status={text(row.status, "UNKNOWN")} /> },
        { id: "price", header: "السعر", cell: (row) => {
          const variant = Array.isArray(row.variants) && row.variants.length > 0 ? row.variants[0] : null;
          const priceCents = variant?.priceCents;
          return formatMoney(priceCents, "EGP");
        } },
        { id: "vendor", header: "البائع", cell: (row) => {
          const vendor = row.vendor as AnyRecord | undefined;
          if (!vendor) return "-";
          return localizedText(vendor.displayName, String(vendor.slug ?? "-"), "ar");
        } },
        { id: "date", header: "التاريخ", cell: (row) => formatDate(row.createdAt) },
      ]}
    />
  );
}

export function ProductDetailPage({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const product = useQuery({
    queryKey: ["/api/admin/products", productId],
    queryFn: () => adminApi<AnyRecord>(`/api/admin/products/${productId}`),
  });
  const availability = useQuery({
    queryKey: ["/api/admin/products", productId, "availability"],
    queryFn: () => adminApi<AnyRecord>(`/api/admin/products/${productId}/availability`),
    retry: false,
  });

  const updateStatus = useMutation({
    mutationFn: (status: "ACTIVE" | "DRAFT" | "ARCHIVED") =>
      adminApi(`/api/admin/admin/products/${productId}/status`, {
        method: "PATCH",
        body: { status },
      }),
    onSuccess: async () => {
      toast.success("تم تحديث حالة المنتج بنجاح");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/products", productId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث حالة المنتج");
    },
  });

  const row = product.data;
  const variants = Array.isArray(row?.variants) ? row.variants as AnyRecord[] : [];
  const images = Array.isArray(row?.images) ? row.images as AnyRecord[] : [];
  const availabilityVariants = Array.isArray(availability.data?.variants) ? availability.data.variants as AnyRecord[] : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={row ? localizedText(row.title, productId, "ar") : `تفاصيل المنتج ${productId}`}
        description="تفتيش بيانات المنتج، البائع، التصنيف، الصور، المتغيرات، وتوفر المخزون."
        actions={
          <Link href="/products" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">
            كل المنتجات
          </Link>
        }
      />
      {product.isLoading ? (
        <LoadingState label="جار تحميل المنتج" />
      ) : product.isError ? (
        <ErrorState message={product.error.message} />
      ) : row ? (
        <>
          <DetailGrid rows={[
            { label: "المعرف", value: text(row.publicId) },
            { label: "Slug", value: text(row.slug) },
            { label: "الحالة", value: <StatusBadge status={text(row.status, "UNKNOWN")} /> },
            { label: "قناة البيع", value: text(row.salesChannel) },
            { label: "السعر", value: (() => { const v = Array.isArray(row.variants) ? (row.variants as AnyRecord[]).reduce((min: AnyRecord | null, x) => (!min || Number(x.priceCents) < Number(min.priceCents) ? x : min), null) : null; return formatMoney(v?.priceCents, "EGP"); })() },
            { label: "البائع", value: (() => { const v = row.vendor as AnyRecord | undefined; if (!v) return "-"; return localizedText(v.displayName, String(v.legalName ?? v.slug ?? "-"), "ar"); })() },
            { label: "التصنيف", value: localizedText((row.category as AnyRecord | undefined)?.name, text((row.category as AnyRecord | undefined)?.slug), "ar") },
            { label: "العلامة", value: localizedText((row.brand as AnyRecord | undefined)?.name, text((row.brand as AnyRecord | undefined)?.slug), "ar") },
            { label: "تاريخ الإنشاء", value: formatDate(row.createdAt) },
          ]} />
          {availability.isError ? (
            <BackendGapCard
              title="توفر المخزون غير متاح لهذا المنتج"
              description="نقطة /v1/products/:publicId/availability تعرض المنتجات النشطة من بائعين معتمدين فقط. إذا كان المنتج قيد المراجعة أو موقوفا فلن تعيد بيانات المخزون."
            />
          ) : (
            <DetailGrid rows={[
              { label: "المتاح للبيع", value: availability.isLoading ? "جار الحساب" : text(availability.data?.availableQty, "0") },
              { label: "عدد المتغيرات", value: text(availabilityVariants.length, "0") },
              { label: "حالة المخزون", value: availability.isLoading ? "-" : Number(availability.data?.availableQty ?? 0) > 0 ? "متاح" : "غير متاح" },
            ]} />
          )}
          <SectionCard title="المتغيرات">
            <CursorDataTable
              data={variants.length ? variants : availabilityVariants}
              getRowKey={(variant) => idOf(variant)}
              columns={[
                { id: "sku", header: "SKU", cell: (variant) => text(variant.sku ?? variant.publicId) },
                { id: "status", header: "الحالة", cell: (variant) => <StatusBadge status={variant.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
                { id: "price", header: "السعر", cell: (variant) => formatMoney(variant.priceCents ?? variant.basePriceCents, "EGP") },
                { id: "stock", header: "المخزون", cell: (variant) => text(variant.availableQty ?? variant.stockQuantity ?? variant.quantity, "-") },
              ]}
            />
          </SectionCard>
          <SectionCard title="الصور">
            {Array.isArray(row.imageUrls) && row.imageUrls.length ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {(row.imageUrls as string[]).map((url: string, index: number) => (
                  <div key={index} className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted shadow-xs">
                    <ClickableImageWithFileFallback src={url} alt={`صورة المنتج ${index + 1}`} className="h-full w-full object-cover" noWrapper={true} />
                  </div>
                ))}
              </div>
            ) : images.length ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {images.map((image) => {
                  const imgUrl = String(image.url ?? image.imageUrl ?? image.fileUrl ?? `/api/admin/files/${image.publicId}`);
                  return (
                    <div key={idOf(image)} className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted shadow-xs">
                      <ClickableImageWithFileFallback src={imgUrl} alt={text(image.altText, "صورة المنتج")} className="h-full w-full object-cover" noWrapper={true} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">لا توجد صور معادة من API لهذا المنتج.</p>
            )}
          </SectionCard>
          <SectionCard
            title="إجراءات الاعتدال والرقابة"
            description="تحديث الحالة التشغيلية للمنتج مباشرة في الخلفية."
            actions={
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={updateStatus.isPending || row.status === "ACTIVE"}
                  onClick={() => updateStatus.mutate("ACTIVE")}
                >
                  اعتماد ونشر (Active)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="bg-warning text-warning-foreground hover:bg-warning/90 border-0"
                  disabled={updateStatus.isPending || row.status === "ARCHIVED"}
                  onClick={() => updateStatus.mutate("ARCHIVED")}
                >
                  إيقاف مؤقت (Archived)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={updateStatus.isPending || row.status === "DRAFT"}
                  onClick={() => updateStatus.mutate("DRAFT")}
                >
                  إرجاع للمسودة (Draft)
                </Button>
              </div>
            }
          />
        </>
      ) : null}
    </div>
  );
}

function SimpleCreateForm({
  title,
  fields,
  onSubmit,
  pending,
}: {
  title: string;
  fields: Array<{ label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string }>;
  onSubmit: () => void;
  pending?: boolean;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }
  return (
    <SectionCard title={title}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          {fields.map((field) => (
            <TextInput key={field.label} {...field} />
          ))}
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          حفظ
        </Button>
      </form>
    </SectionCard>
  );
}

export function CatalogPage() {
  const queryClient = useQueryClient();
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandSlug, setBrandSlug] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

  const importAllCategories = useMutation({
    mutationFn: async () => {
      const response = await fetch("/noon_categories_and_brands.json");
      const data = await response.json() as { categories: Array<{ name_ar: string; name_en: string; slug: string }> };

      setImportProgress({ current: 0, total: data.categories.length });

      for (let i = 0; i < data.categories.length; i++) {
        const cat = data.categories[i];
        try {
          await adminApi("/api/admin/categories", {
            method: "POST",
            body: {
              name: { ar: cat.name_ar, en: cat.name_en },
              slug: cat.slug,
              isActive: true,
            },
          });
        } catch (error) {
          console.error(`Failed to create category ${cat.name_ar}:`, error);
        }
        setImportProgress({ current: i + 1, total: data.categories.length });
      }
    },
    onSuccess: async () => {
      toast.success("تم استيراد جميع التصنيفات بنجاح!");
      setImportProgress(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "تعذر استيراد التصنيفات");
      setImportProgress(null);
    },
  });

  const importAllBrands = useMutation({
    mutationFn: async () => {
      const response = await fetch("/noon_categories_and_brands.json");
      const data = await response.json() as { categories: Array<{ brands: string[] }> };

      const allBrands = Array.from(new Set(data.categories.flatMap((cat) => cat.brands)));

      setImportProgress({ current: 0, total: allBrands.length });

      for (let i = 0; i < allBrands.length; i++) {
        const brandName = allBrands[i];
        const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        try {
          await adminApi("/api/admin/brands", {
            method: "POST",
            body: {
              name: { ar: brandName, en: brandName },
              slug,
              isActive: true,
            },
          });
        } catch (error) {
          console.error(`Failed to create brand ${brandName}:`, error);
        }
        setImportProgress({ current: i + 1, total: allBrands.length });
      }
    },
    onSuccess: async () => {
      toast.success("تم استيراد جميع العلامات التجارية بنجاح!");
      setImportProgress(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/brands"] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "تعذر استيراد العلامات التجارية");
      setImportProgress(null);
    },
  });

  const createCategory = useMutation({
    mutationFn: () => adminApi("/api/admin/categories", { method: "POST", body: { name: { ar: categoryName, en: categoryName }, slug: categorySlug, isActive: true } }),
    onSuccess: async () => { toast.success("تم إنشاء التصنيف"); setCategoryName(""); setCategorySlug(""); await queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر إنشاء التصنيف"),
  });
  const createBrand = useMutation({
    mutationFn: () => adminApi("/api/admin/brands", { method: "POST", body: { name: { ar: brandName, en: brandName }, slug: brandSlug, isActive: true } }),
    onSuccess: async () => { toast.success("تم إنشاء العلامة"); setBrandName(""); setBrandSlug(""); await queryClient.invalidateQueries({ queryKey: ["/api/admin/brands"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر إنشاء العلامة"),
  });
  const createStore = useMutation({
    mutationFn: () => adminApi("/api/admin/store-categories", { method: "POST", body: { name: { ar: storeName, en: storeName }, slug: storeSlug, isActive: true } }),
    onSuccess: async () => { toast.success("تم إنشاء تصنيف المتجر"); setStoreName(""); setStoreSlug(""); await queryClient.invalidateQueries({ queryKey: ["/api/admin/store-categories"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر إنشاء تصنيف المتجر"),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="الكتالوج" description="إدارة التصنيفات والعلامات وتصنيفات المتاجر." />
      <div className="flex flex-wrap gap-2">
        <Link href="/catalog/brands" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">العلامات التجارية</Link>
        <Link href="/catalog/store-categories" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">تصنيفات المتاجر</Link>
        <Link href="/catalog/attributes" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">خصائص التصنيفات</Link>
      </div>
      {importProgress ? (
        <SectionCard>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-bold text-ink-strong">جاري الاستيراد...</span>
              <span className="text-ink-muted">{importProgress.current} من {importProgress.total}</span>
            </div>
            <Progress value={(importProgress.current / importProgress.total) * 100} />
          </div>
        </SectionCard>
      ) : null}
      <SectionCard
        title="استيراد بيانات Noon.com"
        description="استيراد جميع التصنيفات والعلامات التجارية من ملف البيانات"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="primary"
            onClick={() => importAllCategories.mutate()}
            disabled={importAllCategories.isPending || importAllBrands.isPending || importProgress !== null}
            className="flex-1"
          >
            {importAllCategories.isPending ? "جاري الاستيراد..." : "استيراد التصنيفات"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => importAllBrands.mutate()}
            disabled={importAllBrands.isPending || importAllCategories.isPending || importProgress !== null}
            className="flex-1"
          >
            {importAllBrands.isPending ? "جاري الاستيراد..." : "استيراد العلامات"}
          </Button>
        </div>
      </SectionCard>
      <SimpleCreateForm title="إضافة تصنيف" pending={createCategory.isPending} onSubmit={() => createCategory.mutate()} fields={[{ label: "الاسم", value: categoryName, onChange: setCategoryName, required: true }, { label: "Slug", value: categorySlug, onChange: setCategorySlug, required: true }]} />
      <ResourceList<AnyRecord> title="التصنيفات" description="" path="/api/admin/categories" query={{ flat: "true", withCounts: "true" }} columns={[
        {
          id: "image",
          header: "الصورة",
          cell: (r) => r.imageUrl ? (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
              <ClickableImageWithFileFallback src={String(r.imageUrl)} alt="Category" className="h-full w-full object-cover" noWrapper={true} />
            </div>
          ) : (
            <span className="text-xs text-ink-soft">-</span>
          )
        },
        { id: "name", header: "الاسم", cell: (r) => <div><Link href={`/catalog/categories/${idOf(r)}`} className="font-medium text-primary hover:underline">{localizedText(r.name, text(r.slug), "ar")}</Link><div className="text-xs text-ink-muted">{text(r.slug)}</div></div> },
        { id: "status", header: "الحالة", cell: (r) => <StatusBadge status={r.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
        { id: "count", header: "المنتجات", cell: (r) => text(r.productCount ?? (r._count as AnyRecord | undefined)?.products, "0") },
        { id: "date", header: "التاريخ", cell: (r) => formatDate(r.createdAt) },
      ]} normalize={(p) => Array.isArray(p) ? p as AnyRecord[] : []} />
      <SimpleCreateForm title="إضافة علامة تجارية" pending={createBrand.isPending} onSubmit={() => createBrand.mutate()} fields={[{ label: "الاسم", value: brandName, onChange: setBrandName, required: true }, { label: "Slug", value: brandSlug, onChange: setBrandSlug, required: true }]} />
      <ResourceList<AnyRecord> title="العلامات التجارية" description="" path="/api/admin/brands" columns={[
        { id: "name", header: "الاسم", cell: (r) => localizedText(r.name, text(r.slug)) },
        { id: "status", header: "الحالة", cell: (r) => <StatusBadge status={r.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
        { id: "date", header: "التاريخ", cell: (r) => formatDate(r.createdAt) },
      ]} />
      <SimpleCreateForm title="إضافة تصنيف متجر" pending={createStore.isPending} onSubmit={() => createStore.mutate()} fields={[{ label: "الاسم", value: storeName, onChange: setStoreName, required: true }, { label: "المعرّف النصي", value: storeSlug, onChange: setStoreSlug, required: true }]} />
      <ResourceList<AnyRecord> title="تصنيفات المتاجر" description="" path="/api/admin/store-categories" columns={[
        { id: "name", header: "الاسم", cell: (r) => localizedText(r.name, text(r.slug)) },
        { id: "status", header: "الحالة", cell: (r) => <StatusBadge status={r.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
        { id: "date", header: "التاريخ", cell: (r) => formatDate(r.createdAt) },
      ]} normalize={(p) => Array.isArray(p) ? p as AnyRecord[] : []} />
    </div>
  );
}

export function CategoryDetailPage({ categoryId }: { categoryId: string }) {
  const queryClient = useQueryClient();
  const { confirm, element: confirmElement } = useConfirmDialog();
  const [attrKey, setAttrKey] = useState("");
  const [attrLabel, setAttrLabel] = useState("");
  const [attrType, setAttrType] = useState("STRING");
  const [attrUnit, setAttrUnit] = useState("");
  const [attrOptions, setAttrOptions] = useState("");
  const [editingName, setEditingName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  const category = useQuery({
    queryKey: ["/api/admin/categories", categoryId],
    queryFn: () => adminApi<AnyRecord>(`/api/admin/categories/${categoryId}`),
  });
  const attributes = useQuery({
    queryKey: ["/api/admin/categories", categoryId, "attributes"],
    queryFn: () => adminApi<AnyRecord[]>(`/api/admin/categories/${categoryId}/attributes`),
  });
  const createAttribute = useMutation({
    mutationFn: () => {
      const options = attrOptions
        ? attrOptions.split(",").map((option) => option.trim()).filter(Boolean)
        : undefined;
      return adminApi(`/api/admin/categories/${categoryId}/attributes`, {
        method: "POST",
        body: {
          key: attrKey,
          labelI18n: { ar: attrLabel, en: attrLabel },
          dataType: attrType,
          unit: attrUnit || undefined,
          options,
          isFilterable: true,
          isVariantAxis: false,
          isRequired: false,
        },
      });
    },
    onSuccess: async () => {
      toast.success("تم إنشاء خاصية التصنيف");
      setAttrKey("");
      setAttrLabel("");
      setAttrUnit("");
      setAttrOptions("");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/categories", categoryId, "attributes"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر إنشاء الخاصية"),
  });
  const deleteAttribute = useMutation({
    mutationFn: (attributeId: string) =>
      adminApi(`/api/admin/categories/${categoryId}/attributes/${attributeId}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("تم حذف الخاصية");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/categories", categoryId, "attributes"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر حذف الخاصية"),
  });
  const updateCategory = useMutation({
    mutationFn: (name: string) =>
      adminApi(`/api/admin/categories/${categoryId}`, {
        method: "PATCH",
        body: { name: { ar: name, en: name } },
      }),
    onSuccess: async () => {
      toast.success("تم تحديث اسم التصنيف");
      setIsEditingName(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/categories", categoryId] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر تحديث التصنيف"),
  });
  const deleteCategory = useMutation({
    mutationFn: () =>
      adminApi(`/api/admin/categories/${categoryId}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("تم حذف التصنيف");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      setTimeout(() => window.location.href = "/catalog", 500);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر حذف التصنيف"),
  });

  const row = category.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={row ? localizedText(row.name, categoryId, "ar") : `تفاصيل التصنيف ${categoryId}`}
        description="إدارة خصائص التصنيف المستخدمة في فلاتر المنتجات ومتغيراتها."
        actions={
          <Link href="/catalog" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">
            الكتالوج
          </Link>
        }
      />
      {category.isLoading ? (
        <LoadingState label="جار تحميل التصنيف" />
      ) : category.isError ? (
        <ErrorState message={category.error.message} />
      ) : row ? (
        <>
          <DetailGrid rows={[
            { label: "المعرف", value: text(row.publicId) },
            { label: "Slug", value: text(row.slug) },
            {
              label: "الصورة",
              value: row.imageUrl ? (
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                  <ClickableImageWithFileFallback src={String(row.imageUrl)} alt="Category" className="h-full w-full object-cover" noWrapper={true} />
                </div>
              ) : (
                "-"
              )
            },
            { label: "الحالة", value: <StatusBadge status={row.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
            { label: "الترتيب", value: text(row.sortOrder, "0") },
            { label: "تاريخ الإنشاء", value: formatDate(row.createdAt) },
          ]} />
          <SectionCard
            title="إدارة التصنيف"
            description="تعديل اسم التصنيف الحالي أو حذفه بالكامل."
            actions={
              <Button
                type="button"
                size="sm"
                variant="danger"
                disabled={deleteCategory.isPending}
                onClick={async () => {
                  const result = await confirm({
                    title: "حذف التصنيف",
                    description: "سيتم حذف هذا التصنيف نهائياً. هذا الإجراء لا يمكن التراجع عنه.",
                    confirmLabel: "حذف",
                    variant: "danger",
                    requireReason: true,
                    reasonLabel: "سبب الحذف",
                  });
                  if (result.confirmed) deleteCategory.mutate();
                }}
              >
                حذف التصنيف
              </Button>
            }
          >
            {isEditingName ? (
              <div className="space-y-2">
                <FormField label="اسم التصنيف الجديد" required>
                  {(props) => (
                    <FormInput
                      {...props}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      placeholder="أدخل اسم التصنيف الجديد"
                      className="md:max-w-md"
                    />
                  )}
                </FormField>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    disabled={updateCategory.isPending || !editingName}
                    onClick={() => updateCategory.mutate(editingName)}
                  >
                    حفظ
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setIsEditingName(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-strong">الاسم الحالي: <strong>{localizedText(row.name, "-", "ar")}</strong></span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingName(localizedText(row.name, "", "ar"));
                    setIsEditingName(true);
                  }}
                >
                  تعديل الاسم
                </Button>
              </div>
            )}
          </SectionCard>
        </>
      ) : null}
      {row ? (
        <>
          <SimpleCreateForm
            title="إضافة خاصية تصنيف"
            pending={createAttribute.isPending}
            onSubmit={() => createAttribute.mutate()}
            fields={[
              { label: "المفتاح", value: attrKey, onChange: setAttrKey, required: true, placeholder: "color" },
              { label: "العنوان", value: attrLabel, onChange: setAttrLabel, required: true },
              { label: "النوع", value: attrType, onChange: setAttrType, required: true, placeholder: "STRING / ENUM / INT" },
              { label: "الوحدة", value: attrUnit, onChange: setAttrUnit },
              { label: "خيارات ENUM مفصولة بفواصل", value: attrOptions, onChange: setAttrOptions },
            ]}
          />
          <SectionCard title="خصائص التصنيف">
            {attributes.isLoading ? (
              <LoadingState label="جار تحميل الخصائص" />
            ) : attributes.isError ? (
              <ErrorState message={attributes.error.message} />
            ) : (
              <CursorDataTable
                data={attributes.data ?? []}
                getRowKey={(attr) => idOf(attr)}
                columns={[
                  { id: "key", header: "المفتاح", cell: (attr) => <div><div className="font-medium text-ink-strong">{text(attr.key)}</div><div className="text-xs text-ink-muted">{localizedText(attr.labelI18n, text(attr.key), "ar")}</div></div> },
                  { id: "type", header: "النوع", cell: (attr) => text(attr.dataType) },
                  { id: "flags", header: "الاستخدام", cell: (attr) => <div className="text-xs text-ink-strong">{attr.isFilterable ? "فلتر" : "بدون فلتر"} · {attr.isVariantAxis ? "محور متغير" : "خاصية منتج"} · {attr.isRequired ? "إجباري" : "اختياري"}</div> },
                  { id: "options", header: "الخيارات", cell: (attr) => Array.isArray(attr.options) ? attr.options.join(", ") : text(attr.options) },
                  { id: "actions", header: "إجراء", cell: (attr) => (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-danger"
                      disabled={deleteAttribute.isPending}
                      onClick={async () => {
                        const result = await confirm({
                          title: "حذف الخاصية",
                          description: "سيتم حذف هذه الخاصية نهائياً. هذا الإجراء لا يمكن التراجع عنه.",
                          confirmLabel: "حذف",
                          variant: "danger",
                          requireReason: true,
                          reasonLabel: "سبب الحذف",
                        });
                        if (result.confirmed) deleteAttribute.mutate(idOf(attr));
                      }}
                    >
                      حذف
                    </Button>
                  ) },
                ]}
              />
            )}
          </SectionCard>
        </>
      ) : null}
      {confirmElement}
    </div>
  );
}

export function PromotionsPage() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [valueBps, setValueBps] = useState("1000");
  const create = useMutation({
    mutationFn: () => adminApi("/api/admin/admin/promotions", { method: "POST", body: { code, name: { ar: name, en: name }, discountType: "PERCENTAGE", scope: "PLATFORM", valueBps: Number(valueBps), validFrom: new Date().toISOString(), status: "ACTIVE" } }),
    onSuccess: async () => { toast.success("تم إنشاء العرض"); setCode(""); setName(""); await queryClient.invalidateQueries({ queryKey: ["/api/admin/admin/promotions"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر إنشاء العرض"),
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="العروض"
        description="إدارة كوبونات المنصة والعروض التسويقية."
        actions={
          <Link href="/promotions/create" className="inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5">
            إنشاء عرض
          </Link>
        }
      />
      <SimpleCreateForm title="إضافة عرض نسبة مئوية" pending={create.isPending} onSubmit={() => create.mutate()} fields={[{ label: "الكود", value: code, onChange: setCode, required: true }, { label: "الاسم", value: name, onChange: setName, required: true }, { label: "النسبة بالنقاط BPS", value: valueBps, onChange: setValueBps, required: true }]} />
      <ResourceList<AnyRecord> title="قائمة العروض" description="" path="/api/admin/admin/promotions" columns={[
        { id: "name", header: "العرض", cell: (r) => <div><Link href={`/promotions/${idOf(r)}`} className="font-medium text-primary hover:underline">{localizedText(r.name, text(r.code), "ar")}</Link><div className="text-xs text-ink-muted">{text(r.code)}</div></div> },
        { id: "status", header: "الحالة", cell: (r) => <StatusBadge status={text(r.status, "UNKNOWN")} /> },
        { id: "discount", header: "الخصم", cell: (r) => text(r.discountType) },
        { id: "dates", header: "الصلاحية", cell: (r) => <div>{formatDate(r.validFrom)}<br />{formatDate(r.validUntil)}</div> },
      ]} />
    </div>
  );
}

const BANNER_POSITIONS = {
  HOME_HERO: {
    label: "HOME_HERO",
    description: "بانر البطل الرئيسي في الصفحة الرئيسية - يظهر في أعلى الصفحة",
  },
  HOME_STRIP: {
    label: "HOME_STRIP",
    description: "شريط بانر في الصفحة الرئيسية - يظهر كشريط أفقي",
  },
  CATEGORY_HEADER: {
    label: "CATEGORY_HEADER",
    description: "بانر رأس التصنيف - يظهر في أعلى صفحة التصنيف",
  },
  CATEGORIES_FEATURED: {
    label: "CATEGORIES_FEATURED",
    description: "بانر التصنيفات المميزة - يظهر في قسم التصنيفات المميزة",
  },
};

export function BannersPage() {
  const queryClient = useQueryClient();
  const [imageFileId, setImageFileId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [position, setPosition] = useState("HOME_HERO");
  const create = useMutation({
    mutationFn: () => adminApi("/api/admin/admin/banners", { method: "POST", body: { imageFileId, title: { ar: title, en: title }, description: { ar: description, en: description }, position, isActive: true } }),
    onSuccess: async () => { toast.success("تم إنشاء البانر"); setImageFileId(""); setTitle(""); setDescription(""); await queryClient.invalidateQueries({ queryKey: ["/api/admin/admin/banners"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر إنشاء البانر"),
  });
  const toggleActive = useMutation({
    mutationFn: ({ bannerId, isActive }: { bannerId: string; isActive: boolean }) =>
      adminApi(`/api/admin/admin/banners/${bannerId}`, {
        method: "PATCH",
        body: { isActive },
      }),
    onSuccess: async () => {
      toast.success("تم تحديث حالة البانر");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/admin/banners"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر تحديث حالة البانر"),
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="البانرات"
        description="إدارة بانرات الصفحة الرئيسية والحملات."
        actions={
          <Link href="/banners/create" className="inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5">
            إنشاء بانر
          </Link>
        }
      />

      <SectionCard title="إضافة بانر">
        <form onSubmit={(event) => { event.preventDefault(); create.mutate(); }} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput label="العنوان" value={title} onChange={setTitle} required />
            <FormField label="الموضع" hint={BANNER_POSITIONS[position as keyof typeof BANNER_POSITIONS]?.description}>
              {(props) => (
                <FormSelect {...props} value={position} onChange={(e) => setPosition(e.target.value)}>
                  {Object.entries(BANNER_POSITIONS).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </FormSelect>
              )}
            </FormField>
          </div>
          <FormField label="الوصف">
            {(props) => (
              <FormInput
                {...props}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="أدخل وصف البانر (اختياري)"
              />
            )}
          </FormField>
          <ImageUploadInput label="صورة البانر" value={imageFileId} onChange={setImageFileId} purpose="BANNER_IMAGE" required />
          <Button type="submit" size="sm" disabled={create.isPending || !imageFileId}>
            حفظ
          </Button>
        </form>
      </SectionCard>

      <ResourceList<AnyRecord> title="قائمة البانرات" description="" path="/api/admin/admin/banners" columns={[
        {
          id: "image",
          header: "الصورة",
          cell: (r) => r.imageUrl ? (
            <div className="h-20 w-40 shrink-0 overflow-hidden rounded-xl border border-border">
              <ClickableImageWithFileFallback src={String(r.imageUrl)} alt={localizedText(r.title, "Banner", "ar")} className="h-full w-full object-cover" noWrapper={true} />
            </div>
          ) : (
            <span className="text-xs text-ink-soft">-</span>
          )
        },
        { id: "title", header: "العنوان", cell: (r) => <Link href={`/banners/${idOf(r)}`} className="font-medium text-primary hover:underline">{localizedText(r.title, idOf(r), "ar")}</Link> },
        { id: "description", header: "الوصف", cell: (r) => <span className="text-sm text-ink-strong">{localizedText(r.description, "-", "ar")}</span> },
        { id: "position", header: "الموضع", cell: (r) => text(r.position) },
        {
          id: "status",
          header: "الحالة",
          cell: (r) => (
            <div className="flex items-center gap-3">
              <StatusBadge status={r.isActive === false ? "INACTIVE" : "ACTIVE"} />
              <Switch
                checked={r.isActive !== false}
                disabled={toggleActive.isPending}
                onCheckedChange={(checked) => toggleActive.mutate({ bannerId: idOf(r), isActive: checked })}
              />
            </div>
          )
        },
        { id: "date", header: "العرض", cell: (r) => `${formatDate(r.displayFrom)} - ${formatDate(r.displayUntil)}` },
      ]} normalize={(p) => Array.isArray(p) ? p as AnyRecord[] : []} />
    </div>
  );
}

export function ShippingPage() {
  const queryClient = useQueryClient();
  const [zoneName, setZoneName] = useState("");
  const [countryId, setCountryId] = useState("");
  const [methodName, setMethodName] = useState("");
  const [methodCode, setMethodCode] = useState("");
  const [etaMin, setEtaMin] = useState("1");
  const [etaMax, setEtaMax] = useState("3");
  const createZone = useMutation({
    mutationFn: () => adminApi("/api/admin/shipping/admin/zones", { method: "POST", body: { name: { ar: zoneName, en: zoneName }, scope: "COUNTRY", countryId: Number(countryId), isActive: true } }),
    onSuccess: async () => { toast.success("تم إنشاء منطقة الشحن"); setZoneName(""); setCountryId(""); await queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/zones"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر إنشاء المنطقة"),
  });
  const createMethod = useMutation({
    mutationFn: () => adminApi("/api/admin/shipping/admin/methods", { method: "POST", body: { name: { ar: methodName, en: methodName }, code: methodCode, etaMinDays: Number(etaMin), etaMaxDays: Number(etaMax), isActive: true } }),
    onSuccess: async () => { toast.success("تم إنشاء طريقة الشحن"); setMethodName(""); setMethodCode(""); await queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/methods"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر إنشاء الطريقة"),
  });
  return (
    <div className="space-y-6">
      <PageHeader title="الشحن" description="إدارة مناطق وطرق الشحن واختبار التهيئة." />
      <div className="flex flex-wrap gap-2">
        <Link href="/shipping/zones" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">مناطق الشحن</Link>
        <Link href="/shipping/methods" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">طرق الشحن</Link>
        <Link href="/shipping/vendor-rates" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">أسعار البائعين</Link>
        <Link href="/shipping/quote-tester" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">اختبار السعر</Link>
      </div>
      <SimpleCreateForm title="إضافة منطقة شحن" pending={createZone.isPending} onSubmit={() => createZone.mutate()} fields={[{ label: "الاسم", value: zoneName, onChange: setZoneName, required: true }, { label: "معرف الدولة الرقمي", value: countryId, onChange: setCountryId, required: true }]} />
      <ResourceList<AnyRecord> title="مناطق الشحن" description="" path="/api/admin/shipping/zones" normalize={(p) => Array.isArray(p) ? p as AnyRecord[] : []} columns={[
        { id: "name", header: "الاسم", cell: (r) => localizedText(r.name, text(r.code)) },
        { id: "scope", header: "النطاق", cell: (r) => text(r.scope) },
        { id: "status", header: "الحالة", cell: (r) => <StatusBadge status={r.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
      ]} />
      <SimpleCreateForm title="إضافة طريقة شحن" pending={createMethod.isPending} onSubmit={() => createMethod.mutate()} fields={[{ label: "الاسم", value: methodName, onChange: setMethodName, required: true }, { label: "الكود", value: methodCode, onChange: setMethodCode, required: true }, { label: "أقل أيام", value: etaMin, onChange: setEtaMin, required: true }, { label: "أقصى أيام", value: etaMax, onChange: setEtaMax, required: true }]} />
      <ResourceList<AnyRecord> title="طرق الشحن" description="" path="/api/admin/shipping/methods" normalize={(p) => Array.isArray(p) ? p as AnyRecord[] : []} columns={[
        { id: "name", header: "الاسم", cell: (r) => localizedText(r.name, text(r.code)) },
        { id: "code", header: "الكود", cell: (r) => text(r.code) },
        { id: "eta", header: "المدة", cell: (r) => `${text(r.etaMinDays, "0")} - ${text(r.etaMaxDays, "0")} يوم` },
        { id: "status", header: "الحالة", cell: (r) => <StatusBadge status={r.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
      ]} />
    </div>
  );
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [key, setKey] = useState("");
  const [group, setGroup] = useState("MARKETPLACE");
  const [value, setValue] = useState("");
  const [type, setType] = useState("STRING");
  const save = useMutation({
    mutationFn: () => adminApi("/api/admin/admin/settings", { method: "PATCH", body: { settings: [{ key, group, value, type, isPublic: false }] } }),
    onSuccess: async () => { toast.success("تم تحديث الإعداد"); setKey(""); setValue(""); await queryClient.invalidateQueries({ queryKey: ["/api/admin/admin/settings"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر حفظ الإعداد"),
  });
  return (
    <div className="space-y-6">
      <PageHeader title="الإعدادات" description="تعديل إعدادات الأعمال بدون إعادة نشر الخادم." />
      <SimpleCreateForm title="إضافة / تحديث إعداد" pending={save.isPending} onSubmit={() => save.mutate()} fields={[{ label: "المفتاح", value: key, onChange: setKey, required: true }, { label: "المجموعة", value: group, onChange: setGroup, required: true }, { label: "القيمة", value, onChange: setValue, required: true }, { label: "النوع", value: type, onChange: setType, required: true }]} />
      <ResourceList<AnyRecord> title="كل الإعدادات" description="" path="/api/admin/admin/settings" normalize={(p) => Array.isArray(p) ? p as AnyRecord[] : []} columns={[
        { id: "key", header: "المفتاح", cell: (r) => <div><div className="font-medium text-ink-strong">{text(r.key)}</div><div className="text-xs text-ink-muted">{text(r.group)} · {text(r.type)}</div></div> },
        { id: "value", header: "القيمة", cell: (r) => <code className="text-xs text-ink-strong">{text(r.value)}</code> },
        { id: "public", header: "عام؟", cell: (r) => r.isPublic ? "نعم" : "لا" },
        { id: "date", header: "آخر تحديث", cell: (r) => formatDate(r.updatedAt) },
      ]} />
    </div>
  );
}

export function BillingPage() {
  const runBilling = useMutation({
    mutationFn: () => adminApi("/api/admin/admin/vendor-billing/run", { method: "POST", body: {} }),
    onSuccess: () => toast.success("تم تشغيل مهمة الفوترة"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر تشغيل الفوترة"),
  });
  const [paymentId, setPaymentId] = useState("");
  const [reviewStatus, setReviewStatus] = useState("SUCCEEDED");
  const [rejectionReason, setRejectionReason] = useState("");
  const reviewPayment = useMutation({
    mutationFn: () => adminApi(`/api/admin/admin/vendor-billing/payments/${paymentId}/review`, { method: "PATCH", body: { status: reviewStatus, rejectionReason: rejectionReason || undefined } }),
    onSuccess: () => { toast.success("تم اعتماد دفعة الفوترة"); setPaymentId(""); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر اعتماد الدفعة"),
  });
  return (
    <div className="space-y-6">
      <PageHeader title="فواتير البائعين" description="تشغيل الفوترة ومراجعة مدفوعات البائعين." />
      <div className="flex flex-wrap gap-2">
        <Link href="/billing/overview" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">نظرة عامة</Link>
        <Link href="/billing/vendors" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">حسابات البائعين</Link>
        <Link href="/billing/invoices" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">الفواتير</Link>
        <Link href="/billing/payments" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">دفعات الفوترة</Link>
        <Link href="/billing/jobs" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">المهام</Link>
        <Link href="/billing/commission-rates" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">نسب العمولات</Link>
      </div>
      <SectionCard
        title="تشغيل الفوترة"
        description="ينفذ توليد الفواتير وإنفاذ قواعد الفوترة من الخلفية."
        actions={
          <Button
            type="button"
            variant="primary"
            disabled={runBilling.isPending}
            onClick={() => runBilling.mutate()}
          >
            تشغيل مهمة الفوترة
          </Button>
        }
      />
      <SimpleCreateForm title="مراجعة دفعة فوترة" pending={reviewPayment.isPending} onSubmit={() => reviewPayment.mutate()} fields={[
        { label: "معرف دفعة الفوترة", value: paymentId, onChange: setPaymentId, required: true },
        { label: "الحالة", value: reviewStatus, onChange: setReviewStatus, required: true, placeholder: "SUCCEEDED / FAILED / REJECTED" },
        { label: "سبب الرفض", value: rejectionReason, onChange: setRejectionReason },
      ]} />
      <BackendPendingNotice
        endpoint="GET /v1/admin/vendor-billing/accounts"
        priority="P1"
        description="الخلفية توفر ملخص وفواتير ومعاملات البائع عبر /v1/vendors/:vendorId/billing فقط، وتوفر للإدارة تشغيل الفوترة ومراجعة الدفعات. تحتاج اللوحة إلى endpoint إداري عام لقائمة الفواتير والدفعات."
      />
    </div>
  );
}

export function AuditLogsPage() {
  return (
    <ResourceList<AnyRecord>
      title="سجل التدقيق"
      description="تتبع إجراءات الإدارة الحساسة."
      path="/api/admin/admin/audit-logs"
      columns={[
        { id: "action", header: "الإجراء", cell: (r) => <Link href={`/audit-logs/${idOf(r)}`} className="font-medium text-primary hover:underline">{text(r.action)}</Link> },
        { id: "actor", header: "المسؤول", cell: (r) => text((r.actor as AnyRecord | undefined)?.email, "System") },
        { id: "target", header: "الهدف", cell: (r) => `${text(r.targetType)} #${text(r.targetId)}` },
        { id: "date", header: "التاريخ", cell: (r) => formatDate(r.createdAt) },
      ]}
    />
  );
}

export function OpsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="تشغيل النظام" description="صحة النظام، الطوابير، والعمليات الخلفية." />
      <div className="flex flex-wrap gap-2">
        <Link href="/ops/health" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">الصحة والمقاييس</Link>
        <Link href="/ops/queues" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">الطوابير</Link>
        <Link href="/ops/webhooks" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">Webhooks</Link>
        <Link href="/ops/jobs" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">المهام</Link>
      </div>
      <ResourceList<AnyRecord> title="حالة الطوابير" description="" path="/api/admin/admin/ops/queues" normalize={(p) => Object.entries((p ?? {}) as AnyRecord).map(([name, value]) => ({ name, value }))} columns={[
        { id: "name", header: "الطابور", cell: (r) => text(r.name) },
        { id: "value", header: "القيمة", cell: (r) => <pre className="max-w-xl overflow-auto text-xs text-ink-strong">{JSON.stringify(r.value, null, 2)}</pre> },
      ]} />
      <BackendGapCard
        title="فحوصات الصحة والمقاييس خارج proxy الإدارة"
        description="فحوصات /health و /metrics خارج بادئة /v1 في الخلفية. يمكن إضافة route handler منفصل داخل Next proxy لاحقا لعرضها مع حماية الجلسة الإدارية."
      />
    </div>
  );
}
