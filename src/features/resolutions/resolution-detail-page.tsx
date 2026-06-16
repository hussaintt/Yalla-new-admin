"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { ActionDialog } from "@/components/modals/action-dialog";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { SectionCard } from "@/components/ui/section-card";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import type { ResolutionRow } from "@/lib/api/types";
import { formatDate, formatMoney, formatName, localizedText } from "@/lib/formatters";

const TERMINAL_STATUSES = ["RESOLVED", "REJECTED", "CLOSED"];

type ResolveStatus = "RESOLVED" | "REJECTED" | "CLOSED";

type CaseUpdate = { status?: ResolveStatus; note?: string; refundPublicId?: string };

const actionTitles: Record<ResolveStatus, string> = {
  RESOLVED: "حل الحالة",
  REJECTED: "رفض الحالة",
  CLOSED: "إغلاق الحالة",
};

function typeLabel(type: string | undefined): string {
  if (type === "RETURN") return "إرجاع";
  if (type === "DISPUTE") return "نزاع";
  return type ?? "حالة";
}

function actorLabel(actorType: string): string {
  switch (actorType) {
    case "BUYER":
      return "المشتري";
    case "VENDOR":
      return "البائع";
    case "ADMIN":
      return "الدعم";
    default:
      return "النظام";
  }
}

function eventActionLabel(type: string): string {
  switch (type) {
    case "created":
      return "فتح الحالة";
    case "message":
      return "أضاف ملاحظة";
    case "tracking_added":
      return "أضاف رقم التتبع";
    case "withdrawn":
      return "أغلق الحالة";
    case "vendor_review":
      return "بدأ المراجعة";
    case "vendor_approve":
      return "وافق على الطلب";
    case "vendor_reject":
      return "رفض الطلب";
    case "vendor_mark_received":
      return "أكد استلام المرتجع";
    case "admin_action":
      return "حدّث الحالة";
    default:
      return "تحديث";
  }
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

function Timeline({ events }: { events: ResolutionRow["events"] }) {
  if (!events || events.length === 0) {
    return <p className="text-sm text-ink-muted">لا يوجد نشاط بعد.</p>;
  }
  return (
    <ol className="space-y-0">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        return (
          <li key={event.publicId ?? index} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-primary" />
              {!isLast ? <span className="w-0.5 flex-1 bg-border" /> : null}
            </div>
            <div className={isLast ? "" : "pb-4"}>
              <div className="text-sm font-bold text-ink-strong">
                {actorLabel(event.actorType)} • {eventActionLabel(event.type)}
              </div>
              {event.note ? (
                <p className="mt-0.5 text-sm leading-6 text-ink-muted">{event.note}</p>
              ) : null}
              {event.createdAt ? (
                <div className="mt-0.5 text-xs text-ink-muted">{formatDate(event.createdAt)}</div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ResolutionCaseDetailPage({ publicId }: { publicId: string }) {
  const queryClient = useQueryClient();
  const [pendingStatus, setPendingStatus] = useState<ResolveStatus | null>(null);
  const [note, setNote] = useState("");
  const [refundPublicId, setRefundPublicId] = useState("");

  const caseQuery = useQuery({
    queryKey: ["/api/admin/admin/resolutions", publicId],
    queryFn: () => adminApi<ResolutionRow>(adminPaths.adminResolutionDetail(publicId)),
  });

  const updateCase = useMutation({
    mutationFn: (body: CaseUpdate) =>
      adminApi(adminPaths.adminResolutionDetail(publicId), { method: "PATCH", body }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["/api/admin/admin/resolutions", publicId],
      });
      await queryClient.invalidateQueries({ queryKey: ["resolutions"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الحالة");
    },
  });

  const row = caseQuery.data;
  const terminal = row ? TERMINAL_STATUSES.includes(row.status) : false;
  const affectedItems = Array.isArray(row?.affectedItems) ? row.affectedItems : [];

  function submitNote() {
    const trimmed = note.trim();
    if (!trimmed) return;
    updateCase.mutate(
      { note: trimmed },
      {
        onSuccess: () => {
          toast.success("تمت إضافة الملاحظة");
          setNote("");
        },
      },
    );
  }

  function submitRefundLink() {
    const trimmed = refundPublicId.trim();
    if (!trimmed) return;
    updateCase.mutate(
      { refundPublicId: trimmed },
      {
        onSuccess: () => {
          toast.success("تم ربط الاسترداد بالحالة");
          setRefundPublicId("");
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${typeLabel(row?.type)} · ${row?.caseNumber ?? publicId}`}
        description="تفاصيل طلب الإرجاع/النزاع وسجل النشاط والإجراءات."
        actions={
          <Link
            href="/resolutions"
            className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted"
          >
            كل الحالات
          </Link>
        }
      />

      {caseQuery.isLoading ? (
        <LoadingState label="جار تحميل الحالة" />
      ) : caseQuery.isError ? (
        <ErrorState message={caseQuery.error.message} />
      ) : row ? (
        <>
          <DetailGrid
            rows={[
              {
                label: "رقم الحالة",
                value: (
                  <span className="inline-flex items-center gap-1">
                    {row.caseNumber}
                    <CopyButton value={row.caseNumber} />
                  </span>
                ),
              },
              { label: "النوع", value: typeLabel(row.type) },
              { label: "الحالة", value: <StatusBadge status={row.status} /> },
              { label: "سبب الطلب", value: row.reasonCode || "-" },
              {
                label: "الطلب",
                value: row.order?.publicId ? (
                  <Link
                    className="text-primary hover:underline"
                    href={`/orders/${row.order.publicId}`}
                  >
                    {row.order.orderNumber ?? row.order.publicId}
                  </Link>
                ) : (
                  "-"
                ),
              },
              {
                label: "البائع",
                value: row.vendor?.publicId ? (
                  <Link
                    className="text-primary hover:underline"
                    href={`/stores/${row.vendor.publicId}`}
                  >
                    {localizedText(row.vendor.displayName, row.vendor.publicId, "ar")}
                  </Link>
                ) : (
                  "-"
                ),
              },
              {
                label: "المشتري",
                value: row.user
                  ? formatName({ firstName: row.user.firstName, lastName: row.user.lastName })
                  : "-",
              },
              { label: "رقم تتبع الإرجاع", value: row.returnTrackingNumber || "-" },
              { label: "تاريخ الإنشاء", value: formatDate(row.createdAt) },
              { label: "تاريخ الحل", value: row.resolvedAt ? formatDate(row.resolvedAt) : "-" },
            ]}
          />

          {row.description ? (
            <SectionCard title="وصف الطلب">
              <p className="text-sm leading-7 text-ink-muted">{row.description}</p>
            </SectionCard>
          ) : null}

          {affectedItems.length > 0 ? (
            <SectionCard title="العناصر المشمولة" description={`${affectedItems.length} عنصر`}>
              <ul className="space-y-2 text-sm text-ink-strong">
                {affectedItems.map((item) => (
                  <li
                    key={item.orderItemId}
                    className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="font-mono text-xs text-ink-muted">{item.orderItemId}</span>
                    <span>الكمية: {item.quantity}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          <SectionCard
            title="الاسترداد المرتبط"
            description="الاسترداد المالي يُنشأ من شاشة المدفوعات، ثم يُربط بالحالة هنا."
          >
            {row.refund?.publicId ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Link
                  className="font-medium text-primary hover:underline"
                  href={`/refunds/${row.refund.publicId}`}
                >
                  {row.refund.publicId}
                </Link>
                <CopyButton value={row.refund.publicId} />
                <StatusBadge status={row.refund.status ?? "UNKNOWN"} />
                <span className="text-ink-strong">{formatMoney(row.refund.amountCents, "EGP")}</span>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-ink-muted">
                  لا يوجد استرداد مرتبط. أنشئ الاسترداد من{" "}
                  {row.order?.publicId ? (
                    <Link
                      className="text-primary hover:underline"
                      href={`/orders/${row.order.publicId}`}
                    >
                      صفحة الطلب
                    </Link>
                  ) : (
                    "شاشة المدفوعات"
                  )}{" "}
                  ثم الصق معرّف الاسترداد هنا لربطه بالحالة.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={refundPublicId}
                    onChange={(event) => setRefundPublicId(event.target.value)}
                    placeholder="معرّف الاسترداد (refundPublicId)"
                    className="h-11 min-w-[16rem] flex-1 rounded-2xl border border-border bg-muted/40 px-3 text-sm text-ink-strong outline-none transition focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={updateCase.isPending || !refundPublicId.trim()}
                    onClick={submitRefundLink}
                  >
                    ربط الاسترداد
                  </Button>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard title="سجل النشاط">
            <Timeline events={row.events} />
          </SectionCard>

          <SectionCard title="إضافة ملاحظة" description="تظهر للمشتري في سجل نشاط الحالة.">
            <div className="space-y-3">
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="اكتب ملاحظة..."
                className="w-full resize-none rounded-2xl border border-border bg-muted/40 px-3 py-3 text-sm text-ink-strong outline-none transition focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  disabled={updateCase.isPending || !note.trim()}
                  onClick={submitNote}
                >
                  إرسال
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="القرار" description="حدّث حالة الطلب بقرار نهائي.">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline-success"
                disabled={updateCase.isPending || terminal}
                onClick={() => setPendingStatus("RESOLVED")}
              >
                حل
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline-danger"
                disabled={updateCase.isPending || terminal}
                onClick={() => setPendingStatus("REJECTED")}
              >
                رفض
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={updateCase.isPending || terminal}
                onClick={() => setPendingStatus("CLOSED")}
              >
                إغلاق
              </Button>
            </div>
            {terminal ? (
              <p className="mt-2 text-xs text-ink-muted">
                الحالة مغلقة بقرار نهائي ولا يمكن تغييرها.
              </p>
            ) : null}
          </SectionCard>
        </>
      ) : null}

      <ActionDialog
        open={pendingStatus !== null}
        title={pendingStatus ? actionTitles[pendingStatus] : ""}
        description={row ? `الحالة: ${row.caseNumber}` : ""}
        confirmLabel="تأكيد"
        variant={pendingStatus === "RESOLVED" ? "success" : "danger"}
        requireReason={pendingStatus !== "RESOLVED"}
        disabled={updateCase.isPending}
        onCancel={() => setPendingStatus(null)}
        onConfirm={(reason) => {
          if (!pendingStatus) return;
          const status = pendingStatus;
          updateCase.mutate(
            { status, note: reason },
            {
              onSuccess: () => toast.success("تم تحديث الحالة"),
              onSettled: () => setPendingStatus(null),
            },
          );
        }}
      />
    </div>
  );
}
