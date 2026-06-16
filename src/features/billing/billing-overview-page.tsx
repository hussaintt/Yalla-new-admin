"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, DollarSign, FileText, TrendingUp } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/state/async-states";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import type { BillingOverview, CommissionBreakdown } from "@/lib/api/types";
import { formatDate, formatMoney } from "@/lib/formatters";

type AnyRecord = Record<string, unknown>;

function text(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function BillingOverviewPage() {
  const queryClient = useQueryClient();

  const overview = useQuery({
    queryKey: ["billing", "overview"],
    queryFn: () => adminApi<BillingOverview>(adminPaths.billingOverview()),
  });

  const breakdown = useQuery({
    queryKey: ["billing", "commission-breakdown", "vendor"],
    queryFn: () =>
      adminApi<CommissionBreakdown>(adminPaths.billingCommissionBreakdown("vendor")),
  });

  const payouts = useQuery({
    queryKey: ["billing", "payouts", "pending"],
    queryFn: () => adminApi<AnyRecord>(adminPaths.payouts("PENDING", 10)),
  });

  const markPaid = useMutation({
    mutationFn: (payoutId: string) =>
      adminApi(adminPaths.payoutsMarkPaid(payoutId), { method: "POST", body: {} }),
    onSuccess: async () => {
      toast.success("تم تحديث حالة الدفع");
      await queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر تحديث الدفعة"),
  });

  const rejectPayout = useMutation({
    mutationFn: (payoutId: string) =>
      adminApi(adminPaths.payoutsReject(payoutId), { method: "POST", body: { reason: "رفض إداري" } }),
    onSuccess: async () => {
      toast.success("تم رفض الدفعة");
      await queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر رفض الدفعة"),
  });

  const data = overview.data;
  const currency = data?.currency ?? "EGP";
  const payoutsList: AnyRecord[] = (() => {
    const raw = payouts.data;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object" && Array.isArray((raw as AnyRecord).data)) {
      return (raw as AnyRecord).data as AnyRecord[];
    }
    return [];
  })();

  const slices = breakdown.data?.slices ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="نظرة عامة على الفوترة"
        description="فواتير العمولات الشهرية تُصدَر تلقائياً يوم 1 من كل شهر، وآخر موعد للسداد يوم 6 — بعده يُوقَف نشاط البائع المتأخر."
        actions={
          <Link
            href="/billing"
            className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted"
          >
            الفوترة الرئيسية
          </Link>
        }
      />

      {overview.isLoading ? (
        <LoadingState label="جار تحميل بيانات الفوترة" />
      ) : overview.isError ? (
        <ErrorState message={overview.error.message} />
      ) : data ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <KpiCard
              icon={DollarSign}
              tone="orange"
              label="مستحقات غير مدفوعة"
              value={formatMoney(data.outstanding.balanceDueCents, currency)}
            />
            <KpiCard
              icon={FileText}
              tone="blue"
              label="فواتير متأخرة"
              value={text(data.outstanding.overdueInvoiceCount, "0")}
            />
            <KpiCard
              icon={AlertTriangle}
              tone="purple"
              label="متاجر موقوفة"
              value={text(data.restrictedVendorCount, "0")}
            />
            <KpiCard
              icon={TrendingUp}
              tone="teal"
              label={`عمولة ${data.currentMonth.label} (تتراكم)`}
              value={formatMoney(data.currentMonth.accruedCommissionCents, currency)}
            />
          </section>

          <SectionCard
            title="آخر دورة فوترة"
            description="آخر دفعة فواتير تم توليدها تلقائياً للشهر السابق."
          >
            {data.lastBilledPeriod ? (
              <dl className="grid gap-4 md:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold text-ink-muted">الشهر</dt>
                  <dd className="mt-1 text-sm text-ink-strong">{data.lastBilledPeriod.label}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-ink-muted">تاريخ الإصدار</dt>
                  <dd className="mt-1 text-sm text-ink-strong">{formatDate(data.lastBilledPeriod.issuedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-ink-muted">آخر موعد للسداد</dt>
                  <dd className="mt-1 text-sm font-bold text-ink-strong">{formatDate(data.lastBilledPeriod.graceEndsAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-ink-muted">عدد الفواتير</dt>
                  <dd className="mt-1 text-sm text-ink-strong">{data.lastBilledPeriod.invoiceCount}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-ink-muted">إجمالي العمولة</dt>
                  <dd className="mt-1 text-sm text-ink-strong">{formatMoney(data.lastBilledPeriod.totalCommissionCents, currency)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-ink-muted">مدفوع / متبقٍّ</dt>
                  <dd className="mt-1 text-sm text-ink-strong">
                    {formatMoney(data.lastBilledPeriod.paidCents, currency)}
                    <span className="text-ink-muted"> · متبقٍّ </span>
                    {formatMoney(data.lastBilledPeriod.balanceDueCents, currency)}
                  </dd>
                </div>
              </dl>
            ) : (
              <EmptyState title="لم تُصدَر فواتير بعد" description="ستُولَّد أول دفعة فواتير تلقائياً في بداية الشهر القادم." />
            )}
          </SectionCard>
        </>
      ) : (
        <EmptyState title="لا توجد بيانات فوترة" description="تعذر تحميل ملخص الفوترة." />
      )}

      <SectionCard title="توزيع عمولات الشهر الحالي حسب البائع" description="العمولات المتراكمة هذا الشهر مقسمة حسب البائع.">
        {breakdown.isLoading ? (
          <LoadingState label="جار تحميل التوزيع" />
        ) : breakdown.isError ? (
          <ErrorState message={breakdown.error.message} />
        ) : slices.length === 0 ? (
          <EmptyState title="لا توجد عمولات بعد" description="لم تُسجَّل عمولات لهذا الشهر حتى الآن." />
        ) : (
          <CursorDataTable
            data={slices}
            getRowKey={(row) => row.key}
            columns={[
              { id: "vendor", header: "البائع", cell: (row) => text(row.label) },
              { id: "amount", header: "إجمالي العمولة", cell: (row) => formatMoney(row.amountCents, currency) },
              { id: "pct", header: "النسبة", cell: (row) => `${row.pct}%` },
            ]}
          />
        )}
      </SectionCard>

      <SectionCard title="المدفوعات المعلّقة" description="دفعات البائعين بانتظار التحويل أو المراجعة.">
        {payouts.isLoading ? (
          <LoadingState label="جار تحميل المدفوعات" />
        ) : payouts.isError ? (
          <ErrorState message={payouts.error.message} />
        ) : payoutsList.length === 0 ? (
          <EmptyState title="لا توجد مدفوعات معلّقة" description="جميع المدفوعات تمت معالجتها." />
        ) : (
          <CursorDataTable
            data={payoutsList}
            getRowKey={(row) => String(row.publicId ?? row.id)}
            columns={[
              { id: "id", header: "المعرف", cell: (row) => <span className="font-mono text-xs">{text(row.publicId ?? row.id)}</span> },
              { id: "vendor", header: "البائع", cell: (row) => text((row.vendor as AnyRecord)?.email ?? row.vendorId) },
              { id: "amount", header: "المبلغ", cell: (row) => formatMoney(row.amountCents, String(row.currency ?? "EGP")) },
              { id: "status", header: "الحالة", cell: (row) => <StatusBadge status={text(row.status, "UNKNOWN")} /> },
              { id: "date", header: "التاريخ", cell: (row) => formatDate(row.createdAt) },
              {
                id: "actions",
                header: "إجراءات",
                cell: (row) => (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={markPaid.isPending}
                      onClick={() => markPaid.mutate(String(row.publicId ?? row.id))}
                      className="border-success/30 text-success"
                    >
                      تأكيد الدفع
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={rejectPayout.isPending}
                      onClick={() => rejectPayout.mutate(String(row.publicId ?? row.id))}
                      className="border-destructive/30 text-destructive"
                    >
                      رفض
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </SectionCard>
    </div>
  );
}
