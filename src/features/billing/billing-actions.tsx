"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, LoadingState } from "@/components/state/async-states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminApi } from "@/lib/api/admin-client";
import { withQuery } from "@/lib/api/paths";
import { formatDate, formatMoney } from "@/lib/formatters";

type AnyRecord = Record<string, unknown>;

const OFFLINE_METHODS = [
  { label: "نقدي / عند الاستلام", value: "CASH" },
  { label: "تحويل بنكي", value: "BANK_TRANSFER" },
];

const inputClass =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-ink-strong shadow-sm outline-none focus:ring-2 focus:ring-ring";

function errorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export function useSettleInvoiceOffline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      invoiceId,
      method,
      reference,
      note,
    }: {
      invoiceId: string;
      method: string;
      reference?: string;
      note?: string;
    }) =>
      adminApi<AnyRecord>(
        `/api/admin/admin/vendor-billing/invoices/${invoiceId}/settle-offline`,
        {
          method: "POST",
          body: {
            method,
            ...(reference ? { reference } : {}),
            ...(note ? { note } : {}),
          },
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}

export function useReactivateVendorBilling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      vendorId,
      mode,
      graceDays,
      note,
    }: {
      vendorId: string;
      mode: "EXTEND_GRACE" | "WAIVE";
      graceDays?: number;
      note?: string;
    }) =>
      adminApi<AnyRecord>(
        `/api/admin/admin/vendor-billing/accounts/${vendorId}/reactivate`,
        {
          method: "POST",
          body: {
            mode,
            ...(mode === "EXTEND_GRACE" && graceDays ? { graceDays } : {}),
            ...(note ? { note } : {}),
          },
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}

/**
 * Per-invoice offline settlement (used on the invoices page). Records commission
 * collected outside the app (cash / COD / direct contact); paying off the blocking
 * invoice automatically re-enables the store in the app.
 */
export function SettleInvoiceDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: AnyRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const settle = useSettleInvoiceOffline();

  if (!invoice) return null;
  const currency = String(invoice.currency ?? "EGP");
  const vendor = invoice.vendor as AnyRecord | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تسجيل سداد خارج التطبيق</DialogTitle>
          <DialogDescription>
            فاتورة {String(invoice.invoiceNumber ?? invoice.publicId)} — {String(vendor?.displayName ?? "")}
            {" · "}المستحق: {formatMoney(invoice.balanceDueCents, currency)}. تسوية الفاتورة تعيد
            تفعيل المتجر في التطبيق تلقائياً إذا كان موقوفاً بسببها.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-right">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">طريقة التحصيل</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
              {OFFLINE_METHODS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">مرجع (اختياري)</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="رقم إيصال / تحويل"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">ملاحظة (اختياري)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: تم التحصيل نقداً عند التسليم"
              className={inputClass}
            />
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={settle.isPending}
            onClick={() =>
              settle.mutate(
                {
                  invoiceId: String(invoice.publicId ?? invoice.id),
                  method,
                  reference: reference.trim() || undefined,
                  note: note.trim() || undefined,
                },
                {
                  onSuccess: () => {
                    toast.success("تم تسجيل السداد وتسوية الفاتورة");
                    onOpenChange(false);
                  },
                  onError: (e) => toast.error(errorMessage(e, "تعذر تسجيل السداد")),
                },
              )
            }
          >
            {settle.isPending ? "جار التسجيل..." : `تسوية ${formatMoney(invoice.balanceDueCents, currency)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Full billing control for one vendor (used on the stopped-stores page):
 * settle due invoices as paid-offline, or re-enable the store without payment
 * (grace extension / waiver).
 */
export function VendorBillingControlDialog({
  vendorId,
  vendorName,
  currency,
  restricted,
  open,
  onOpenChange,
}: {
  vendorId: string;
  vendorName: string;
  currency: string;
  restricted: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [tab, setTab] = useState<"settle" | "reactivate">("settle");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [graceDays, setGraceDays] = useState(7);
  const [confirmWaive, setConfirmWaive] = useState(false);

  const settle = useSettleInvoiceOffline();
  const reactivate = useReactivateVendorBilling();

  const invoices = useQuery({
    queryKey: ["billing", "vendor-invoices", vendorId],
    queryFn: () =>
      adminApi<AnyRecord>(
        withQuery("/api/admin/admin/vendor-billing/invoices", { vendorId, limit: "50" }),
      ),
    enabled: open,
  });

  const dueInvoices: AnyRecord[] = (() => {
    const raw = invoices.data;
    const list = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object" && Array.isArray((raw as AnyRecord).data)
        ? ((raw as AnyRecord).data as AnyRecord[])
        : [];
    return list.filter(
      (invoice) =>
        ["OPEN", "OVERDUE"].includes(String(invoice.status)) &&
        Number(invoice.balanceDueCents ?? 0) > 0,
    );
  })();

  const totalDueCents = dueInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.balanceDueCents ?? 0),
    0,
  );

  async function settleAll() {
    try {
      for (const invoice of dueInvoices) {
        await settle.mutateAsync({
          invoiceId: String(invoice.publicId),
          method,
          note: note.trim() || undefined,
        });
      }
      toast.success("تمت تسوية جميع الفواتير المستحقة وإعادة تفعيل المتجر");
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e, "تعذر إتمام التسوية"));
    }
  }

  const tabButton = (value: "settle" | "reactivate", label: string) => (
    <button
      type="button"
      onClick={() => setTab(value)}
      className={`h-10 flex-1 rounded-xl text-sm font-bold transition ${
        tab === value
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted text-ink-muted hover:text-ink-strong"
      }`}
    >
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إدارة عمولات «{vendorName}»</DialogTitle>
          <DialogDescription>
            {restricted
              ? "هذا المتجر موقوف حالياً ومخفي من التطبيق بسبب عمولات غير مسددة."
              : "إدارة الفواتير المستحقة على هذا المتجر."}
            {" "}إجمالي المستحق: <span className="font-bold">{formatMoney(totalDueCents, currency)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          {tabButton("settle", "تم الدفع خارج التطبيق")}
          {tabButton("reactivate", "إعادة تفعيل بدون سداد")}
        </div>

        {invoices.isLoading ? (
          <LoadingState label="جار تحميل الفواتير" />
        ) : dueInvoices.length === 0 ? (
          <EmptyState
            title="لا توجد فواتير مستحقة"
            description={
              restricted
                ? "لا توجد فواتير مفتوحة — استخدم إعادة التفعيل لرفع الإيقاف."
                : "جميع فواتير هذا المتجر مسددة."
            }
          />
        ) : (
          <div className="space-y-2">
            {dueInvoices.map((invoice) => (
              <div
                key={String(invoice.publicId)}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2"
              >
                <div>
                  <div className="font-mono text-xs font-semibold text-ink-strong">
                    {String(invoice.invoiceNumber ?? invoice.publicId)}
                  </div>
                  <div className="text-xs text-ink-muted">
                    مهلة السداد حتى {formatDate(invoice.graceEndsAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-destructive">
                    {formatMoney(invoice.balanceDueCents, String(invoice.currency ?? currency))}
                  </span>
                  {tab === "settle" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-success"
                      disabled={settle.isPending}
                      onClick={() =>
                        settle.mutate(
                          {
                            invoiceId: String(invoice.publicId),
                            method,
                            note: note.trim() || undefined,
                          },
                          {
                            onSuccess: () => toast.success("تمت تسوية الفاتورة"),
                            onError: (e) => toast.error(errorMessage(e, "تعذر تسوية الفاتورة")),
                          },
                        )
                      }
                    >
                      تسوية
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "settle" ? (
          <div className="space-y-3 text-right">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-muted">طريقة التحصيل</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
                  {OFFLINE_METHODS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-muted">ملاحظة (اختياري)</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="مثال: دفع نقداً / تواصل مباشر"
                  className={inputClass}
                />
              </div>
            </div>
            {dueInvoices.length > 0 ? (
              <Button type="button" className="w-full" disabled={settle.isPending} onClick={settleAll}>
                {settle.isPending
                  ? "جار التسجيل..."
                  : `تسوية كل المستحق (${formatMoney(totalDueCents, currency)}) وإعادة التفعيل`}
              </Button>
            ) : null}
            <p className="text-xs leading-6 text-ink-muted">
              يُسجَّل المبلغ كمدفوعة يدوية على الفاتورة ويُرفع الإيقاف تلقائياً فور تسوية كامل
              المستحق. تُحفظ العملية في سجل التدقيق باسمك.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-right">
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <div className="mb-2 text-sm font-bold text-ink-strong">تمديد مهلة السداد</div>
              <p className="mb-3 text-xs leading-6 text-ink-muted">
                يظهر المتجر في التطبيق فوراً وتبقى الفاتورة مستحقة. إذا لم يتم السداد قبل نهاية
                المهلة الجديدة سيُوقَف المتجر تلقائياً مرة أخرى.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={graceDays}
                  onChange={(e) => setGraceDays(Math.max(1, Math.min(90, Number(e.target.value) || 7)))}
                  className={`${inputClass} w-24`}
                />
                <span className="text-sm text-ink-muted">يوم</span>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={reactivate.isPending}
                  onClick={() =>
                    reactivate.mutate(
                      {
                        vendorId,
                        mode: "EXTEND_GRACE",
                        graceDays,
                        note: note.trim() || undefined,
                      },
                      {
                        onSuccess: () => {
                          toast.success("تم تمديد المهلة وإعادة تفعيل المتجر");
                          onOpenChange(false);
                        },
                        onError: (e) => toast.error(errorMessage(e, "تعذر تمديد المهلة")),
                      },
                    )
                  }
                >
                  تمديد وإعادة تفعيل
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-destructive/30 bg-destructive-soft/40 p-3">
              <div className="mb-2 text-sm font-bold text-destructive">إعفاء نهائي من المستحق</div>
              <p className="mb-3 text-xs leading-6 text-ink-muted">
                تُلغى الفواتير المستحقة نهائياً ({formatMoney(totalDueCents, currency)}) ويُعاد تفعيل
                المتجر. لا يمكن التراجع عن هذا الإجراء.
              </p>
              <label className="mb-3 flex items-center gap-2 text-xs font-semibold text-ink-strong">
                <input
                  type="checkbox"
                  checked={confirmWaive}
                  onChange={(e) => setConfirmWaive(e.target.checked)}
                  className="size-4 accent-destructive"
                />
                أؤكد الإعفاء النهائي من المبلغ المستحق
              </label>
              <Button
                type="button"
                variant="danger"
                className="w-full"
                disabled={!confirmWaive || reactivate.isPending}
                onClick={() =>
                  reactivate.mutate(
                    { vendorId, mode: "WAIVE", note: note.trim() || undefined },
                    {
                      onSuccess: () => {
                        toast.success("تم الإعفاء من المستحق وإعادة تفعيل المتجر");
                        onOpenChange(false);
                      },
                      onError: (e) => toast.error(errorMessage(e, "تعذر تنفيذ الإعفاء")),
                    },
                  )
                }
              >
                إعفاء وإعادة تفعيل
              </Button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-muted">ملاحظة (تُحفظ في سجل التدقيق)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="سبب إعادة التفعيل"
                className={inputClass}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
