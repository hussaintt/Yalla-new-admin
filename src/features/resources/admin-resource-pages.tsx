"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Download, FolderTree, Layers, Plus, RefreshCw, Search, Store, Tag } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bannerSchema, type BannerFormValues } from "@/features/banners/schema";

import { ClickableImageWithFileFallback } from "@/components/clickable-image-fallback";
import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { EntityEditorDrawer, type EditorField, type EditorFieldOption } from "@/components/forms/entity-editor-drawer";
import { ImageUploadInput } from "@/components/image-upload-input";
import { PageHeader } from "@/components/layout/page-header";
import { ActionDialog } from "@/components/modals/action-dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApi } from "@/lib/api/admin-client";
import type { CursorPage } from "@/lib/api/pagination";
import { adminPaths, withQuery } from "@/lib/api/paths";
import { formatDate, formatMoney, localizedText } from "@/lib/formatters";
import { SLUG_PATTERN, toSlugOrFallback } from "@/lib/slug";
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

// Brands are paginated server-side, so a single request is capped. Page through
// every brand via the cursor so selectors and counts are never limited.
async function fetchAllBrands(): Promise<AnyRecord[]> {
  const all: AnyRecord[] = [];
  let cursor: string | undefined;
  for (let guard = 0; guard < 1000; guard++) {
    const data = await adminApi<unknown>(withQuery("/api/admin/brands", { limit: "1000", cursor }));
    if (Array.isArray(data)) {
      all.push(...(data as AnyRecord[]));
      break;
    }
    const page = data as CursorPage<AnyRecord>;
    all.push(...(page.data ?? []));
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return all;
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
  const shipments = Array.isArray(row?.shipments) ? row.shipments as AnyRecord[] : [];
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

          <SectionCard title="الشحنات" description="شحنات شركات الشحن المرتبطة بهذا الطلب وحالة تتبعها.">
            {shipments.length === 0 ? (
              <EmptyState title="لا توجد شحنات" description="لم يربط أي بائع شحنة عبر شركة شحن بهذا الطلب بعد." />
            ) : (
              <CursorDataTable data={shipments} getRowKey={(shipment) => idOf(shipment)} columns={[
                { id: "carrier", header: "شركة الشحن", cell: (shipment) => text(shipment.carrierCode) },
                {
                  id: "tracking",
                  header: "رقم التتبع",
                  cell: (shipment) => {
                    const trackingNumber = text(shipment.trackingNumber, "");
                    const trackingUrl = text(shipment.trackingUrl, "");
                    return (
                      <div className="flex items-center gap-1">
                        {trackingUrl ? (
                          <a href={trackingUrl} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline" dir="ltr">
                            {trackingNumber}
                          </a>
                        ) : (
                          <span dir="ltr">{trackingNumber}</span>
                        )}
                        {trackingNumber ? <CopyButton value={trackingNumber} /> : null}
                      </div>
                    );
                  },
                },
                { id: "status", header: "الحالة", cell: (shipment) => <StatusBadge status={text(shipment.status, "CREATED")} /> },
                { id: "lastEvent", header: "آخر تحديث من الناقل", cell: (shipment) => shipment.lastEventAt ? formatDate(shipment.lastEventAt) : "—" },
                { id: "lastPolled", header: "آخر استعلام", cell: (shipment) => shipment.lastPolledAt ? formatDate(shipment.lastPolledAt) : "—" },
              ]} />
            )}
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
                  {list.map((event, index) => {
                    const eventType = text(event.type ?? event.action ?? event.status, "EVENT");
                    const data = (event.data && typeof event.data === "object" ? event.data : {}) as AnyRecord;
                    const isShipmentEvent = eventType === "SHIPMENT_TRACKING";
                    const message = isShipmentEvent
                      ? localizedText(data.description, text(event.message ?? event.description ?? event.note, ""), "ar")
                      : text(event.message ?? event.description ?? event.note, "");
                    const shipmentMeta = isShipmentEvent
                      ? [text(data.carrierCode, ""), text(data.trackingNumber, ""), text(data.location, "")].filter(Boolean).join(" • ")
                      : "";
                    return (
                      <li key={idOf(event) + index} className="relative">
                        <span className="absolute -start-[1.45rem] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-primary-soft" />
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={eventType} />
                          <span className="text-xs text-ink-muted">{formatDate(isShipmentEvent && data.occurredAt ? data.occurredAt : event.createdAt ?? event.at ?? event.timestamp)}</span>
                        </div>
                        {message ? (
                          <p className="mt-1 text-sm text-ink-strong">{message}</p>
                        ) : null}
                        {shipmentMeta ? (
                          <p className="mt-0.5 text-xs text-ink-muted" dir="ltr">{shipmentMeta}</p>
                        ) : null}
                      </li>
                    );
                  })}
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
          const name = localizedText(vendor.displayName, String(vendor.legalName ?? vendor.slug ?? "-"), "ar");
          const vid = text(vendor.publicId);
          return vid ? <Link className="font-medium text-primary hover:underline" href={`/vendors/${vid}`}>{name}</Link> : name;
        } },
        { id: "date", header: "التاريخ", cell: (row) => formatDate(row.createdAt) },
      ]}
    />
  );
}

const productEditSchema = z.object({
  titleAr: z.string().min(1, "الاسم بالعربية مطلوب"),
  titleEn: z.string().min(1, "الاسم بالإنجليزية مطلوب"),
  descriptionAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  slug: z.string().min(2, "الرابط البديل مطلوب"),
  salesChannel: z.enum(["RETAIL", "BULK"]),
  minimumOrderQuantity: z.coerce.number().min(1, "الحد الأدنى للطلب يجب أن يكون 1 على الأقل"),
  categoryPublicId: z.string().optional(),
  brandPublicId: z.string().optional(),
});

type ProductEditValues = z.infer<typeof productEditSchema>;

export function ProductDetailPage({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const { confirm, element: confirmElement } = useConfirmDialog();
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);

  const product = useQuery({
    queryKey: ["/api/admin/products", productId],
    queryFn: () => adminApi<AnyRecord>(`/api/admin/products/${productId}`),
  });
  const availability = useQuery({
    queryKey: ["/api/admin/products", productId, "availability"],
    queryFn: () => adminApi<AnyRecord>(`/api/admin/products/${productId}/availability`),
    retry: false,
  });

  const categoriesQuery = useQuery({
    queryKey: ["/api/admin/categories", { flat: "true", limit: "500" }],
    queryFn: () => adminApi<unknown>(withQuery("/api/admin/categories", { flat: "true", limit: "500" })),
  });

  const brandsQuery = useQuery({
    queryKey: ["/api/admin/brands", "all"],
    queryFn: fetchAllBrands,
  });

  const categoriesList = useMemo(() => {
    if (!categoriesQuery.data) return [];
    if (Array.isArray(categoriesQuery.data)) return categoriesQuery.data;
    const page = categoriesQuery.data as { data?: AnyRecord[] };
    return page.data ?? [];
  }, [categoriesQuery.data]);

  const brandsList = useMemo(() => {
    if (!brandsQuery.data) return [];
    if (Array.isArray(brandsQuery.data)) return brandsQuery.data;
    const page = brandsQuery.data as { data?: AnyRecord[] };
    return page.data ?? [];
  }, [brandsQuery.data]);

  const categoryOptions = useMemo<EditorFieldOption[]>(() => {
    return [
      { value: "", label: "بدون تصنيف" },
      ...categoriesList.map((c) => ({
        value: String(c.publicId ?? ""),
        label: localizedText(c.name, text(c.slug), "ar"),
      })),
    ];
  }, [categoriesList]);

  const brandOptions = useMemo<EditorFieldOption[]>(() => {
    return [
      { value: "", label: "بدون علامة تجارية" },
      ...brandsList.map((b) => ({
        value: String(b.publicId ?? ""),
        label: localizedText(b.name, text(b.slug), "ar"),
      })),
    ];
  }, [brandsList]);

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

  const deleteProduct = useMutation({
    mutationFn: () => adminApi(`/api/admin/admin/products/${productId}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("تم حذف المنتج نهائياً");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      setTimeout(() => { window.location.href = "/products"; }, 500);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر حذف المنتج");
    },
  });

  const row = product.data;

  const editProduct = useMutation({
    mutationFn: (values: ProductEditValues) => {
      const vendorId = String((row?.vendor as AnyRecord | undefined)?.publicId ?? row?.vendorPublicId ?? "");
      if (!vendorId) {
        throw new Error("لم يتم العثور على معرف البائع لهذا المنتج");
      }
      return adminApi(`/api/admin/vendors/${vendorId}/products/${productId}`, {
        method: "PATCH",
        body: {
          title: { ar: values.titleAr, en: values.titleEn },
          description: { ar: values.descriptionAr, en: values.descriptionEn },
          slug: values.slug,
          salesChannel: values.salesChannel,
          minimumOrderQuantity: values.minimumOrderQuantity,
          categoryPublicId: values.categoryPublicId || null,
          brandPublicId: values.brandPublicId || null,
        },
      });
    },
    onSuccess: async () => {
      toast.success("تم تحديث بيانات المنتج بنجاح");
      setEditDrawerOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/products", productId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث بيانات المنتج");
    },
  });

  const variants = Array.isArray(row?.variants) ? row.variants as AnyRecord[] : [];
  const images = Array.isArray(row?.images) ? row.images as AnyRecord[] : [];
  const availabilityVariants = Array.isArray(availability.data?.variants) ? availability.data.variants as AnyRecord[] : [];

  const fields: EditorField<ProductEditValues>[] = [
    { name: "titleAr", label: "الاسم بالعربية", required: true, colSpan: 2 },
    { name: "titleEn", label: "الاسم بالإنجليزية", required: true, colSpan: 2 },
    { name: "descriptionAr", label: "الوصف بالعربية", kind: "textarea", rows: 3, colSpan: 2 },
    { name: "descriptionEn", label: "الوصف بالإنجليزية", kind: "textarea", rows: 3, colSpan: 2 },
    { name: "slug", label: "الرابط البديل (Slug)", required: true, dir: "ltr", colSpan: 2 },
    {
      name: "salesChannel",
      label: "قناة البيع",
      kind: "select",
      options: [
        { value: "RETAIL", label: "تجزئة (Retail)" },
        { value: "BULK", label: "جملة (Bulk)" },
      ],
      required: true,
    },
    { name: "minimumOrderQuantity", label: "الحد الأدنى للطلب", kind: "number", required: true },
    { name: "categoryPublicId", label: "التصنيف", kind: "select", options: categoryOptions, colSpan: 2 },
    { name: "brandPublicId", label: "العلامة التجارية", kind: "select", options: brandOptions, colSpan: 2 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={row ? localizedText(row.title, productId, "ar") : `تفاصيل المنتج ${productId}`}
        description="تفتيش بيانات المنتج، البائع، التصنيف، الصور، المتغيرات، وتوفر المخزون."
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setEditDrawerOpen(true)}
              disabled={product.isLoading}
            >
              تعديل المنتج
            </Button>
            <Link href="/products" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">
              كل المنتجات
            </Link>
          </div>
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
            { label: "البائع", value: (() => { const v = row.vendor as AnyRecord | undefined; if (!v) return "-"; const name = localizedText(v.displayName, String(v.legalName ?? v.slug ?? "-"), "ar"); const vid = text(v.publicId); return vid ? <Link className="font-medium text-primary hover:underline" href={`/vendors/${vid}`}>{name}</Link> : name; })() },
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
                <Button
                  type="button"
                  size="sm"
                  variant="outline-danger"
                  disabled={deleteProduct.isPending}
                  onClick={async () => {
                    const result = await confirm({
                      title: "حذف المنتج نهائياً",
                      description: "سيتم حذف هذا المنتج وكل بياناته (المتغيرات، الصور، المخزون، التقييمات) نهائياً من قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء. إذا كان المنتج مرتبطاً بطلبات سابقة فلن يُحذف، استخدم الإيقاف المؤقت (Archived) بدلاً من ذلك.",
                      confirmLabel: "حذف نهائي",
                      variant: "danger",
                    });
                    if (result.confirmed) deleteProduct.mutate();
                  }}
                >
                  حذف نهائي من قاعدة البيانات
                </Button>
              </div>
            }
          />
        </>
      ) : null}
      {confirmElement}
      {row && (
        <EntityEditorDrawer<ProductEditValues>
          open={editDrawerOpen}
          onOpenChange={setEditDrawerOpen}
          title="تعديل المنتج"
          description="تحديث بيانات المنتج الأساسية، التصنيف، العلامة التجارية وقناة البيع."
          schema={productEditSchema}
          fields={fields}
          defaultValues={{
            titleAr: String((row.title as AnyRecord)?.ar || ""),
            titleEn: String((row.title as AnyRecord)?.en || ""),
            descriptionAr: String((row.description as AnyRecord)?.ar || ""),
            descriptionEn: String((row.description as AnyRecord)?.en || ""),
            slug: String(row.slug || ""),
            salesChannel: (row.salesChannel as "RETAIL" | "BULK") || "RETAIL",
            minimumOrderQuantity: Number(row.minimumOrderQuantity || 1),
            categoryPublicId: String((row.category as AnyRecord)?.publicId || ""),
            brandPublicId: String((row.brand as AnyRecord)?.publicId || ""),
          }}
          pending={editProduct.isPending}
          onSubmit={(values) => editProduct.mutate(values)}
        />
      )}
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

const catalogItemSchema = z.object({
  nameAr: z.string().min(1, "الاسم بالعربية مطلوب"),
  nameEn: z.string().optional().default(""),
  slug: z
    .string()
    .min(1, "المعرّف النصي مطلوب")
    .regex(SLUG_PATTERN, "أحرف إنجليزية صغيرة وأرقام وشرطات فقط"),
});
type CatalogItemValues = z.infer<typeof catalogItemSchema>;

const catalogItemFields: EditorField<CatalogItemValues>[] = [
  { name: "nameAr", label: "الاسم بالعربية", required: true, placeholder: "مثال: إلكترونيات", colSpan: 2 },
  { name: "nameEn", label: "الاسم بالإنجليزية", placeholder: "e.g. Electronics", dir: "ltr", colSpan: 2 },
  { name: "slug", label: "المعرّف النصي (Slug) — أحرف إنجليزية صغيرة وأرقام وشرطات", required: true, placeholder: "electronics", dir: "ltr", colSpan: 2 },
];

const defaultCatalogValues: CatalogItemValues = { nameAr: "", nameEn: "", slug: "" };

function CatalogStatCard({ icon, label, count, loading }: { icon: React.ReactNode; label: string; count: number; loading: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-ink-muted">{label}</p>
        <p className="text-xl font-extrabold text-ink-strong">
          {loading ? "..." : count.toLocaleString("ar-EG-u-nu-latn")}
        </p>
      </div>
    </div>
  );
}

function CatalogSearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "بحث..."}
        className="h-10 w-full rounded-xl border border-border bg-card pe-4 ps-10 text-sm text-ink-strong placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

function CatalogTabContent<T extends AnyRecord>({
  path,
  query,
  columns,
  normalize,
  searchValue,
}: {
  path: string;
  query?: Record<string, string | undefined>;
  columns: Array<{ id: string; header: React.ReactNode; cell: (row: T) => React.ReactNode }>;
  normalize?: (payload: unknown) => T[] | CursorPage<T>;
  searchValue: string;
}) {
  const [cursor, setCursor] = useState<string | undefined>();
  // Reset to the first page whenever the search term changes, so a stale cursor
  // from prior paging doesn't scope the search to a partial window.
  useEffect(() => {
    setCursor(undefined);
  }, [searchValue]);
  const params = { limit: "20", cursor, ...(query ?? {}) };
  const url = withQuery(path, params);
  const list = useQuery({
    queryKey: [path, params],
    queryFn: () => adminApi<unknown>(url),
  });

  const result = useMemo(() => {
    if (!list.data) return { data: [] as T[], hasMore: false, nextCursor: null };
    const normalized = normalize?.(list.data);
    if (Array.isArray(normalized)) return { data: normalized, hasMore: false, nextCursor: null };
    if (normalized) return normalized;
    if (Array.isArray(list.data)) return { data: list.data as T[], hasMore: false, nextCursor: null };
    const page = list.data as CursorPage<T>;
    return { data: page.data ?? [], hasMore: page.hasMore, nextCursor: page.nextCursor };
  }, [list.data, normalize]);

  const filtered = useMemo(() => {
    if (!searchValue.trim()) return result.data;
    const q = searchValue.trim().toLowerCase();
    return result.data.filter((row) => {
      const name = typeof row.name === "object" ? localizedText(row.name, "", "ar") : String(row.name ?? "");
      const slug = String(row.slug ?? "");
      return name.toLowerCase().includes(q) || slug.toLowerCase().includes(q);
    });
  }, [result.data, searchValue]);

  if (list.isLoading) return <TableSkeleton />;
  if (list.isError) return <ErrorState message={list.error.message} />;
  if (filtered.length === 0) return <EmptyState title="لا توجد بيانات" description={searchValue ? "لا توجد نتائج مطابقة للبحث." : "لا توجد عناصر حاليا."} />;

  return (
    <div className="space-y-3">
      <CursorDataTable data={filtered} getRowKey={(row) => idOf(row)} columns={columns} />
      {!searchValue && (
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={!cursor} onClick={() => setCursor(undefined)}>
            الأولى
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={!result.hasMore || !result.nextCursor} onClick={() => setCursor(result.nextCursor ?? undefined)}>
            التالي
          </Button>
        </div>
      )}
    </div>
  );
}

export function CatalogPage() {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTarget, setDrawerTarget] = useState<"category" | "brand" | "store">("category");
  const [importExpanded, setImportExpanded] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [catSearch, setCatSearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [storeSearch, setStoreSearch] = useState("");

  // Categories and store-categories return full arrays, so their search filters
  // client-side. Brands are paginated, so brand search must hit the server —
  // debounce it to avoid a request per keystroke.
  const [debouncedBrandSearch, setDebouncedBrandSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedBrandSearch(brandSearch.trim()), 250);
    return () => clearTimeout(id);
  }, [brandSearch]);

  const categoriesCount = useQuery({
    queryKey: ["/api/admin/categories", "count"],
    queryFn: async () => {
      const data = await adminApi<unknown>(withQuery("/api/admin/categories", { flat: "true", limit: "1" }));
      if (Array.isArray(data)) return data.length;
      const page = data as CursorPage<AnyRecord>;
      return page.data?.length ?? 0;
    },
  });
  const brandsCount = useQuery({
    queryKey: ["/api/admin/brands", "all"],
    queryFn: fetchAllBrands,
    select: (rows) => rows.length,
  });
  const storeCatsCount = useQuery({
    queryKey: ["/api/admin/store-categories", "count"],
    queryFn: async () => {
      const data = await adminApi<unknown>(withQuery("/api/admin/store-categories", { limit: "1" }));
      if (Array.isArray(data)) return data.length;
      const page = data as CursorPage<AnyRecord>;
      return page.data?.length ?? 0;
    },
  });

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
            body: { name: { ar: cat.name_ar, en: cat.name_en }, slug: cat.slug, isActive: true },
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
        const bName = allBrands[i];
        const slug = toSlugOrFallback(bName);
        try {
          await adminApi("/api/admin/brands", {
            method: "POST",
            body: { name: { ar: bName, en: bName }, slug, isActive: true },
          });
        } catch (error) {
          console.error(`Failed to create brand ${bName}:`, error);
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
    mutationFn: (values: CatalogItemValues) =>
      adminApi("/api/admin/categories", {
        method: "POST",
        body: { name: { ar: values.nameAr, en: values.nameEn || values.nameAr }, slug: values.slug, isActive: true },
      }),
    onSuccess: async () => {
      toast.success("تم إنشاء التصنيف");
      setDrawerOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر إنشاء التصنيف"),
  });

  const createBrand = useMutation({
    mutationFn: (values: CatalogItemValues) =>
      adminApi("/api/admin/brands", {
        method: "POST",
        body: { name: { ar: values.nameAr, en: values.nameEn || values.nameAr }, slug: values.slug, isActive: true },
      }),
    onSuccess: async () => {
      toast.success("تم إنشاء العلامة التجارية");
      setDrawerOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/brands"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر إنشاء العلامة"),
  });

  const createStore = useMutation({
    mutationFn: (values: CatalogItemValues) =>
      adminApi("/api/admin/store-categories", {
        method: "POST",
        body: { name: { ar: values.nameAr, en: values.nameEn || values.nameAr }, slug: values.slug, isActive: true },
      }),
    onSuccess: async () => {
      toast.success("تم إنشاء تصنيف المتجر");
      setDrawerOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/store-categories"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر إنشاء تصنيف المتجر"),
  });

  const isImporting = importAllCategories.isPending || importAllBrands.isPending || importProgress !== null;

  const drawerLabels: Record<typeof drawerTarget, { title: string; description: string }> = {
    category: { title: "إضافة تصنيف جديد", description: "أدخل بيانات التصنيف لإضافته إلى الكتالوج." },
    brand: { title: "إضافة علامة تجارية", description: "أدخل بيانات العلامة التجارية الجديدة." },
    store: { title: "إضافة تصنيف متجر", description: "أدخل بيانات تصنيف المتجر الجديد." },
  };

  function openDrawer(target: typeof drawerTarget) {
    setDrawerTarget(target);
    setDrawerOpen(true);
  }

  function handleDrawerSubmit(values: CatalogItemValues) {
    // Guarantee a URL-safe slug even if validation was bypassed or the name is Arabic-only.
    const normalized = { ...values, slug: toSlugOrFallback(values.slug, values.nameEn || values.nameAr) };
    if (drawerTarget === "category") createCategory.mutate(normalized);
    else if (drawerTarget === "brand") createBrand.mutate(normalized);
    else createStore.mutate(normalized);
  }

  const drawerPending = createCategory.isPending || createBrand.isPending || createStore.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="الكتالوج"
        description="إدارة التصنيفات والعلامات التجارية وتصنيفات المتاجر في مكان واحد."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/catalog/attributes" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-ink-strong shadow-sm transition hover:bg-muted">
              <Layers className="h-3.5 w-3.5" />
              خصائص التصنيفات
            </Link>
            <Button type="button" size="sm" variant="secondary" onClick={() => setImportExpanded((p) => !p)}>
              <Download className="h-3.5 w-3.5" />
              استيراد بيانات
              {importExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <CatalogStatCard icon={<FolderTree className="h-5 w-5" />} label="التصنيفات" count={categoriesCount.data ?? 0} loading={categoriesCount.isLoading} />
        <CatalogStatCard icon={<Tag className="h-5 w-5" />} label="العلامات التجارية" count={brandsCount.data ?? 0} loading={brandsCount.isLoading} />
        <CatalogStatCard icon={<Store className="h-5 w-5" />} label="تصنيفات المتاجر" count={storeCatsCount.data ?? 0} loading={storeCatsCount.isLoading} />
      </div>

      {importExpanded && (
        <SectionCard
          title="استيراد بيانات Noon.com"
          description="استيراد جميع التصنيفات والعلامات التجارية من ملف البيانات"
        >
          {importProgress ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-bold text-ink-strong">جاري الاستيراد...</span>
                <span className="text-ink-muted">{importProgress.current} من {importProgress.total}</span>
              </div>
              <Progress value={(importProgress.current / importProgress.total) * 100} />
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="primary" onClick={() => importAllCategories.mutate()} disabled={isImporting} className="flex-1">
                <Download className="h-4 w-4" />
                {importAllCategories.isPending ? "جاري الاستيراد..." : "استيراد التصنيفات"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => importAllBrands.mutate()} disabled={isImporting} className="flex-1">
                <Download className="h-4 w-4" />
                {importAllBrands.isPending ? "جاري الاستيراد..." : "استيراد العلامات"}
              </Button>
            </div>
          )}
        </SectionCard>
      )}

      <Tabs defaultValue="categories" className="gap-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="categories">
            <FolderTree className="h-3.5 w-3.5" />
            التصنيفات
          </TabsTrigger>
          <TabsTrigger value="brands">
            <Tag className="h-3.5 w-3.5" />
            العلامات التجارية
          </TabsTrigger>
          <TabsTrigger value="store-categories">
            <Store className="h-3.5 w-3.5" />
            تصنيفات المتاجر
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xs flex-1">
              <CatalogSearchBar value={catSearch} onChange={setCatSearch} placeholder="بحث في التصنيفات..." />
            </div>
            <Button type="button" size="sm" onClick={() => openDrawer("category")}>
              <Plus className="h-4 w-4" />
              إضافة تصنيف
            </Button>
          </div>
          <CatalogTabContent<AnyRecord>
            path="/api/admin/categories"
            query={{ flat: "true", withCounts: "true" }}
            searchValue={catSearch}
            normalize={(p) => Array.isArray(p) ? p as AnyRecord[] : []}
            columns={[
              {
                id: "image",
                header: "الصورة",
                cell: (r) => r.imageUrl ? (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                    <ClickableImageWithFileFallback src={String(r.imageUrl)} alt="Category" className="h-full w-full object-cover" noWrapper={true} />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/50">
                    <FolderTree className="h-5 w-5 text-ink-muted/40" />
                  </div>
                ),
              },
              {
                id: "name",
                header: "الاسم",
                cell: (r) => (
                  <div>
                    <Link href={`/catalog/categories/${idOf(r)}`} className="font-medium text-primary hover:underline">
                      {localizedText(r.name, text(r.slug), "ar")}
                    </Link>
                    <div className="text-xs text-ink-muted">{text(r.slug)}</div>
                  </div>
                ),
              },
              { id: "status", header: "الحالة", cell: (r) => <StatusBadge status={r.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
              { id: "count", header: "المنتجات", cell: (r) => <span className="font-semibold">{text(r.productCount ?? (r._count as AnyRecord | undefined)?.products, "0")}</span> },
              { id: "date", header: "التاريخ", cell: (r) => <span className="text-xs text-ink-muted">{formatDate(r.createdAt)}</span> },
            ]}
          />
        </TabsContent>

        <TabsContent value="brands" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xs flex-1">
              <CatalogSearchBar value={brandSearch} onChange={setBrandSearch} placeholder="بحث في العلامات التجارية..." />
            </div>
            <Button type="button" size="sm" onClick={() => openDrawer("brand")}>
              <Plus className="h-4 w-4" />
              إضافة علامة تجارية
            </Button>
          </div>
          <CatalogTabContent<AnyRecord>
            path="/api/admin/brands"
            query={{ q: debouncedBrandSearch || undefined }}
            searchValue={debouncedBrandSearch}
            columns={[
              {
                id: "name",
                header: "الاسم",
                cell: (r) => (
                  <div>
                    <span className="font-medium text-ink-strong">{localizedText(r.name, text(r.slug))}</span>
                    <div className="text-xs text-ink-muted">{text(r.slug)}</div>
                  </div>
                ),
              },
              { id: "status", header: "الحالة", cell: (r) => <StatusBadge status={r.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
              { id: "date", header: "التاريخ", cell: (r) => <span className="text-xs text-ink-muted">{formatDate(r.createdAt)}</span> },
            ]}
          />
        </TabsContent>

        <TabsContent value="store-categories" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xs flex-1">
              <CatalogSearchBar value={storeSearch} onChange={setStoreSearch} placeholder="بحث في تصنيفات المتاجر..." />
            </div>
            <Button type="button" size="sm" onClick={() => openDrawer("store")}>
              <Plus className="h-4 w-4" />
              إضافة تصنيف متجر
            </Button>
          </div>
          <CatalogTabContent<AnyRecord>
            path="/api/admin/store-categories"
            searchValue={storeSearch}
            normalize={(p) => Array.isArray(p) ? p as AnyRecord[] : []}
            columns={[
              {
                id: "name",
                header: "الاسم",
                cell: (r) => (
                  <div>
                    <span className="font-medium text-ink-strong">{localizedText(r.name, text(r.slug))}</span>
                    <div className="text-xs text-ink-muted">{text(r.slug)}</div>
                  </div>
                ),
              },
              { id: "status", header: "الحالة", cell: (r) => <StatusBadge status={r.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
              { id: "date", header: "التاريخ", cell: (r) => <span className="text-xs text-ink-muted">{formatDate(r.createdAt)}</span> },
            ]}
          />
        </TabsContent>
      </Tabs>

      <EntityEditorDrawer<CatalogItemValues>
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={drawerLabels[drawerTarget].title}
        description={drawerLabels[drawerTarget].description}
        schema={catalogItemSchema}
        fields={catalogItemFields}
        defaultValues={defaultCatalogValues}
        submitLabel="إضافة"
        pending={drawerPending}
        onSubmit={handleDrawerSubmit}
      />
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
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      title: "",
      description: "",
      position: "HOME_HERO",
      imageFileId: "",
      isActive: "true",
    },
  });

  const selectedPosition = watch("position");

  const create = useMutation({
    mutationFn: (values: BannerFormValues) =>
      adminApi("/api/admin/admin/banners", {
        method: "POST",
        body: {
          imageFileId: values.imageFileId,
          title: { ar: values.title, en: values.title },
          description: values.description ? { ar: values.description, en: values.description } : undefined,
          position: values.position,
          isActive: values.isActive === "true",
        },
      }),
    onSuccess: async () => {
      toast.success("تم إنشاء البانر");
      reset();
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/admin/banners"] });
    },
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

  const onSubmit = (values: BannerFormValues) => {
    create.mutate(values);
  };

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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="العنوان" required error={errors.title?.message}>
              {(props) => (
                <FormInput
                  {...props}
                  invalid={!!errors.title}
                  {...register("title")}
                />
              )}
            </FormField>
            <FormField label="الموضع" hint={BANNER_POSITIONS[selectedPosition as keyof typeof BANNER_POSITIONS]?.description} error={errors.position?.message}>
              {(props) => (
                <FormSelect {...props} invalid={!!errors.position} {...register("position")}>
                  {Object.entries(BANNER_POSITIONS).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </FormSelect>
              )}
            </FormField>
          </div>
          <FormField label="الوصف" error={errors.description?.message}>
            {(props) => (
              <FormInput
                {...props}
                placeholder="أدخل وصف البانر (اختياري)"
                invalid={!!errors.description}
                {...register("description")}
              />
            )}
          </FormField>
          <div className="space-y-1.5">
            <Controller
              control={control}
              name="imageFileId"
              render={({ field }) => (
                <ImageUploadInput
                  label="صورة البانر"
                  value={field.value}
                  onChange={field.onChange}
                  purpose="BANNER_IMAGE"
                  required
                />
              )}
            />
            {errors.imageFileId && (
              <p className="text-xs font-semibold text-destructive">{errors.imageFileId.message}</p>
            )}
          </div>
          <Button type="submit" size="sm" disabled={create.isPending}>
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
              <ClickableImageWithFileFallback src={String(r.imageUrl)} alt={localizedText(r.title, "البانر", "ar")} className="h-full w-full object-cover" noWrapper={true} />
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
  const [activeTab, setActiveTab] = useState("zones");
  const [zoneDrawerOpen, setZoneDrawerOpen] = useState(false);
  const [methodDrawerOpen, setMethodDrawerOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<AnyRecord | null>(null);
  const [editingMethod, setEditingMethod] = useState<AnyRecord | null>(null);
  const { confirm, element: confirmElement } = useConfirmDialog();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncAllGovernorates = async () => {
    try {
      setIsSyncing(true);
      const cities = await adminApi<AnyRecord[]>("/api/admin/admin/locations/cities");
      if (!Array.isArray(cities) || cities.length === 0) {
        toast.error("لم يتم العثور على أي محافظات/مدن. يرجى تهيئة المواقع الجغرافية أولاً.");
        return;
      }

      const existingCityIds = new Set(
        zonesList
          .filter((z) => String(z.scope) === "CITY" && z.cityId)
          .map((z) => String(z.cityId))
      );

      const missingCities = cities.filter(
        (c) => !existingCityIds.has(String(c.id))
      );

      if (missingCities.length === 0) {
        toast.info("جميع المحافظات مضافة بالفعل كالمناطق شحن.");
        return;
      }

      toast.loading(`جاري إضافة ${missingCities.length} محافظة كمناطق شحن...`, { id: "sync-zones" });

      for (const city of missingCities) {
        const nameAr = typeof city.name === "object" ? String((city.name as AnyRecord)?.ar || "") : String(city.name ?? "");
        const nameEn = typeof city.name === "object" ? String((city.name as AnyRecord)?.en || "") : "";
        await adminApi(adminPaths.shippingAdminZones(), {
          method: "POST",
          body: {
            name: { ar: nameAr || "غير معروف", en: nameEn || "" },
            scope: "CITY",
            countryId: Number(city.countryId ?? 1),
            cityId: Number(city.id),
            isActive: true,
          },
        });
      }

      toast.success("تمت إضافة جميع المحافظات كمناطق شحن بنجاح", { id: "sync-zones" });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/zones"] });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "حدث خطأ أثناء إضافة المحافظات", { id: "sync-zones" });
    } finally {
      setIsSyncing(false);
    }
  };

  const zones = useQuery({
    queryKey: ["/api/admin/shipping/zones"],
    queryFn: () => adminApi<AnyRecord[]>("/api/admin/shipping/zones"),
  });
  const methods = useQuery({
    queryKey: ["/api/admin/shipping/methods"],
    queryFn: () => adminApi<AnyRecord[]>("/api/admin/shipping/methods"),
  });

  const zonesList = Array.isArray(zones.data) ? zones.data : [];
  const methodsList = Array.isArray(methods.data) ? methods.data : [];

  const saveZone = useMutation({
    mutationFn: (values: AnyRecord) => {
      const body = {
        name: { ar: String(values.nameAr ?? ""), en: String(values.nameEn ?? "") },
        scope: String(values.scope ?? "COUNTRY"),
        countryId: Number(values.countryId),
        cityId: values.cityId ? Number(values.cityId) : undefined,
        areaId: values.areaId ? Number(values.areaId) : undefined,
        isActive: values.isActive === "true" || values.isActive === true,
      };
      if (editingZone) {
        return adminApi(adminPaths.shippingAdminZoneDetail(String(editingZone.publicId)), { method: "PATCH", body });
      }
      return adminApi(adminPaths.shippingAdminZones(), { method: "POST", body });
    },
    onSuccess: async () => {
      toast.success(editingZone ? "تم تحديث منطقة الشحن" : "تم إنشاء منطقة الشحن");
      setZoneDrawerOpen(false);
      setEditingZone(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/zones"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر حفظ المنطقة"),
  });

  const deleteZone = useMutation({
    mutationFn: (publicId: string) =>
      adminApi(adminPaths.shippingAdminZoneDetail(publicId), { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("تم حذف منطقة الشحن");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/zones"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر حذف المنطقة"),
  });

  const saveMethod = useMutation({
    mutationFn: (values: AnyRecord) => {
      const body = {
        name: { ar: String(values.nameAr ?? ""), en: String(values.nameEn ?? "") },
        code: String(values.code ?? ""),
        carrierLabel: values.carrierLabel ? String(values.carrierLabel) : undefined,
        etaMinDays: Number(values.etaMinDays ?? 1),
        etaMaxDays: Number(values.etaMaxDays ?? 3),
        isActive: values.isActive === "true" || values.isActive === true,
      };
      if (editingMethod) {
        return adminApi(adminPaths.shippingAdminMethodDetail(String(editingMethod.publicId)), { method: "PATCH", body });
      }
      return adminApi(adminPaths.shippingAdminMethods(), { method: "POST", body });
    },
    onSuccess: async () => {
      toast.success(editingMethod ? "تم تحديث طريقة الشحن" : "تم إنشاء طريقة الشحن");
      setMethodDrawerOpen(false);
      setEditingMethod(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/methods"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر حفظ الطريقة"),
  });

  const deleteMethod = useMutation({
    mutationFn: (publicId: string) =>
      adminApi(adminPaths.shippingAdminMethodDetail(publicId), { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("تم حذف طريقة الشحن");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/methods"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر حذف الطريقة"),
  });

  const zoneSchema = z.object({
    nameAr: z.string().min(1, "الاسم بالعربية مطلوب"),
    nameEn: z.string().optional().default(""),
    scope: z.string().default("COUNTRY"),
    countryId: z.string().min(1, "معرف الدولة مطلوب"),
    cityId: z.string().optional().default(""),
    areaId: z.string().optional().default(""),
    isActive: z.string().default("true"),
  });

  const methodSchema = z.object({
    nameAr: z.string().min(1, "الاسم بالعربية مطلوب"),
    nameEn: z.string().optional().default(""),
    code: z.string().min(2, "الكود مطلوب (حرفين على الأقل)"),
    carrierLabel: z.string().optional().default(""),
    etaMinDays: z.string().min(1, "أقل عدد أيام مطلوب"),
    etaMaxDays: z.string().min(1, "أقصى عدد أيام مطلوب"),
    isActive: z.string().default("true"),
  });

  type ZoneValues = z.infer<typeof zoneSchema>;
  type MethodValues = z.infer<typeof methodSchema>;

  const zoneFields: EditorField<ZoneValues>[] = [
    { name: "nameAr", label: "الاسم بالعربية", required: true, colSpan: 2 },
    { name: "nameEn", label: "الاسم بالإنجليزية", dir: "ltr", colSpan: 2 },
    { name: "scope", label: "النطاق", kind: "select", options: [{ value: "COUNTRY", label: "دولة" }, { value: "CITY", label: "مدينة" }, { value: "AREA", label: "منطقة" }], required: true },
    { name: "countryId", label: "معرف الدولة (رقمي)", required: true },
    { name: "cityId", label: "معرف المدينة (اختياري)" },
    { name: "areaId", label: "معرف المنطقة (اختياري)" },
    { name: "isActive", label: "الحالة", kind: "select", options: [{ value: "true", label: "نشطة" }, { value: "false", label: "غير نشطة" }] },
  ];

  const methodFields: EditorField<MethodValues>[] = [
    { name: "nameAr", label: "الاسم بالعربية", required: true, colSpan: 2 },
    { name: "nameEn", label: "الاسم بالإنجليزية", dir: "ltr", colSpan: 2 },
    { name: "code", label: "الكود", required: true, placeholder: "STANDARD_DELIVERY", dir: "ltr" },
    { name: "carrierLabel", label: "اسم شركة الشحن", placeholder: "مثال: أرامكس" },
    { name: "etaMinDays", label: "أقل عدد أيام توصيل", required: true },
    { name: "etaMaxDays", label: "أقصى عدد أيام توصيل", required: true },
    { name: "isActive", label: "الحالة", kind: "select", options: [{ value: "true", label: "نشطة" }, { value: "false", label: "غير نشطة" }] },
  ];

  function i18nVal(name: unknown, locale: "ar" | "en") {
    if (name && typeof name === "object") {
      return String((name as AnyRecord)[locale] ?? "");
    }
    return locale === "ar" && typeof name === "string" ? name : "";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الشحن"
        description="إدارة مناطق وطرق الشحن وتعريفات الأسعار واختبار التهيئة."
        actions={
          <div className="flex gap-2">
            <Link href="/shipping/vendor-rates" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">أسعار البائعين</Link>
            <Link href="/shipping/quote-tester" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">اختبار السعر</Link>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="zones">مناطق الشحن ({zonesList.length})</TabsTrigger>
          <TabsTrigger value="methods">طرق الشحن ({methodsList.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="zones" className="space-y-4">
          <SectionCard
            title="مناطق الشحن"
            description="تحديد المناطق الجغرافية المخدومة بالتوصيل."
            actions={
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSyncing}
                  onClick={handleSyncAllGovernorates}
                >
                  <RefreshCw className={`me-1.5 size-4 ${isSyncing ? "animate-spin" : ""}`} />
                  تهيئة جميع المحافظات
                </Button>
                <Button type="button" variant="primary" onClick={() => { setEditingZone(null); setZoneDrawerOpen(true); }}>
                  <Plus className="me-1.5 size-4" />
                  إضافة منطقة
                </Button>
              </div>
            }
          >
            {zones.isLoading ? (
              <TableSkeleton />
            ) : zones.isError ? (
              <ErrorState message={zones.error.message} />
            ) : zonesList.length === 0 ? (
              <EmptyState title="لا توجد مناطق شحن" description="ابدأ بإضافة منطقة شحن جديدة." />
            ) : (
              <CursorDataTable
                data={zonesList}
                getRowKey={(r) => String(r.publicId ?? r.id)}
                columns={[
                  { id: "name", header: "الاسم", cell: (r) => <div><div className="font-medium text-ink-strong">{localizedText(r.name, "-", "ar")}</div>{i18nVal(r.name, "en") ? <div className="text-xs text-ink-muted">{i18nVal(r.name, "en")}</div> : null}</div> },
                  { id: "scope", header: "النطاق", cell: (r) => <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-bold text-ink-strong">{text(r.scope)}</span> },
                  { id: "country", header: "الدولة", cell: (r) => text(r.countryId) },
                  { id: "status", header: "الحالة", cell: (r) => <StatusBadge status={r.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
                  { id: "created", header: "تاريخ الإنشاء", cell: (r) => formatDate(r.createdAt) },
                  {
                    id: "actions", header: "إجراءات", cell: (r) => (
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant="secondary" onClick={() => { setEditingZone(r); setZoneDrawerOpen(true); }}>تعديل</Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline-danger"
                          disabled={deleteZone.isPending}
                          onClick={async () => {
                            const result = await confirm({ title: "حذف منطقة الشحن", description: "سيتم حذف هذه المنطقة نهائياً.", confirmLabel: "حذف", variant: "danger" });
                            if (result.confirmed) deleteZone.mutate(String(r.publicId));
                          }}
                        >
                          حذف
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          <SectionCard
            title="طرق الشحن"
            description="طرق التوصيل المتاحة مع مدة التسليم المتوقعة."
            actions={
              <Button type="button" variant="primary" onClick={() => { setEditingMethod(null); setMethodDrawerOpen(true); }}>
                <Plus className="me-1.5 size-4" />
                إضافة طريقة
              </Button>
            }
          >
            {methods.isLoading ? (
              <TableSkeleton />
            ) : methods.isError ? (
              <ErrorState message={methods.error.message} />
            ) : methodsList.length === 0 ? (
              <EmptyState title="لا توجد طرق شحن" description="ابدأ بإضافة طريقة شحن جديدة." />
            ) : (
              <CursorDataTable
                data={methodsList}
                getRowKey={(r) => String(r.publicId ?? r.id)}
                columns={[
                  { id: "name", header: "الاسم", cell: (r) => <div><div className="font-medium text-ink-strong">{localizedText(r.name, "-", "ar")}</div>{i18nVal(r.name, "en") ? <div className="text-xs text-ink-muted">{i18nVal(r.name, "en")}</div> : null}</div> },
                  { id: "code", header: "الكود", cell: (r) => <span className="font-mono text-xs font-semibold text-ink-strong">{text(r.code)}</span> },
                  { id: "carrier", header: "شركة الشحن", cell: (r) => text(r.carrierLabel) },
                  { id: "eta", header: "مدة التوصيل", cell: (r) => `${text(r.etaMinDays, "0")} - ${text(r.etaMaxDays, "0")} يوم` },
                  { id: "status", header: "الحالة", cell: (r) => <StatusBadge status={r.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
                  { id: "created", header: "تاريخ الإنشاء", cell: (r) => formatDate(r.createdAt) },
                  {
                    id: "actions", header: "إجراءات", cell: (r) => (
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant="secondary" onClick={() => { setEditingMethod(r); setMethodDrawerOpen(true); }}>تعديل</Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline-danger"
                          disabled={deleteMethod.isPending}
                          onClick={async () => {
                            const result = await confirm({ title: "حذف طريقة الشحن", description: "سيتم حذف هذه الطريقة نهائياً.", confirmLabel: "حذف", variant: "danger" });
                            if (result.confirmed) deleteMethod.mutate(String(r.publicId));
                          }}
                        >
                          حذف
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      <EntityEditorDrawer<ZoneValues>
        open={zoneDrawerOpen}
        onOpenChange={setZoneDrawerOpen}
        title={editingZone ? "تعديل منطقة الشحن" : "إضافة منطقة شحن جديدة"}
        description="حدد اسم المنطقة ونطاقها الجغرافي وحالة التفعيل."
        schema={zoneSchema}
        pending={saveZone.isPending}
        defaultValues={editingZone ? {
          nameAr: i18nVal(editingZone.name, "ar"),
          nameEn: i18nVal(editingZone.name, "en"),
          scope: String(editingZone.scope ?? "COUNTRY"),
          countryId: String(editingZone.countryId ?? ""),
          cityId: String(editingZone.cityId ?? ""),
          areaId: String(editingZone.areaId ?? ""),
          isActive: editingZone.isActive === false ? "false" : "true",
        } : { nameAr: "", nameEn: "", scope: "COUNTRY", countryId: "", cityId: "", areaId: "", isActive: "true" }}
        fields={zoneFields}
        onSubmit={(values) => saveZone.mutate(values as unknown as AnyRecord)}
      />

      <EntityEditorDrawer<MethodValues>
        open={methodDrawerOpen}
        onOpenChange={setMethodDrawerOpen}
        title={editingMethod ? "تعديل طريقة الشحن" : "إضافة طريقة شحن جديدة"}
        description="حدد اسم طريقة الشحن وكودها ومدة التوصيل المتوقعة."
        schema={methodSchema}
        pending={saveMethod.isPending}
        defaultValues={editingMethod ? {
          nameAr: i18nVal(editingMethod.name, "ar"),
          nameEn: i18nVal(editingMethod.name, "en"),
          code: String(editingMethod.code ?? ""),
          carrierLabel: String(editingMethod.carrierLabel ?? ""),
          etaMinDays: String(editingMethod.etaMinDays ?? "1"),
          etaMaxDays: String(editingMethod.etaMaxDays ?? "3"),
          isActive: editingMethod.isActive === false ? "false" : "true",
        } : { nameAr: "", nameEn: "", code: "", carrierLabel: "", etaMinDays: "1", etaMaxDays: "3", isActive: "true" }}
        fields={methodFields}
        onSubmit={(values) => saveMethod.mutate(values as unknown as AnyRecord)}
      />

      {confirmElement}
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
