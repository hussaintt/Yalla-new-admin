"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, FileText, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/state/async-states";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { formatDate, formatMoney } from "@/lib/formatters";

type AnyRecord = Record<string, unknown>;

function text(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function BillingOverviewPage() {
  const queryClient = useQueryClient();

  const cycle = useQuery({
    queryKey: ["billing", "cycles", "current"],
    queryFn: () => adminApi<AnyRecord>(adminPaths.billingCyclesCurrent()),
  });

  const breakdown = useQuery({
    queryKey: ["billing", "cycles", "current", "breakdown"],
    queryFn: () => adminApi<AnyRecord[]>(adminPaths.billingCyclesCurrentCommissionBreakdown("vendor")),
  });

  const payouts = useQuery({
    queryKey: ["billing", "payouts", "pending"],
    queryFn: () => adminApi<AnyRecord>(adminPaths.payouts("PENDING", 10)),
  });

  const closeCycle = useMutation({
    mutationFn: (cycleId: string) =>
      adminApi(adminPaths.billingCyclesClose(cycleId), { method: "POST", body: {} }),
    onSuccess: async () => {
      toast.success("تم إغلاق دورة الفوترة بنجاح");
      await queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر إغلاق الدورة"),
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

  const cycleData = cycle.data;
  const payoutsList: AnyRecord[] = (() => {
    const data = payouts.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && Array.isArray((data as AnyRecord).data)) {
      return (data as AnyRecord).data as AnyRecord[];
    }
    return [];
  })();

  const breakdownList: AnyRecord[] = Array.isArray(breakdown.data) ? breakdown.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="نظرة عامة على الفوترة"
        description="دورة الفوترة الحالية وتوزيع العمولات والمدفوعات المعلّقة."
        actions={
          <Link
            href="/billing"
            className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted"
          >
            الفوترة الرئيسية
          </Link>
        }
      />

      {cycle.isLoading ? (
        <LoadingState label="جار تحميل بيانات الدورة" />
      ) : cycle.isError ? (
        <ErrorState message={cycle.error.message} />
      ) : cycleData ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <KpiCard
              icon={FileText}
              tone="blue"
              label="معرف الدورة"
              value={text(cycleData.publicId ?? cycleData.id)}
            />
            <KpiCard
              icon={TrendingUp}
              tone="teal"
              label="حالة الدورة"
              value={text(cycleData.status)}
            />
            <KpiCard
              icon={DollarSign}
              tone="orange"
              label="إجمالي العمولات"
              value={formatMoney(cycleData.totalCommissionCents, "EGP")}
            />
            <KpiCard
              icon={Users}
              tone="purple"
              label="عدد البائعين"
              value={text(cycleData.vendorCount, "0")}
            />
          </section>

          <SectionCard
            title="تفاصيل الدورة الحالية"
            description="بداية ونهاية الدورة وإجراء الإغلاق."
            actions={
              cycleData.status !== "CLOSED" ? (
                <Button
                  type="button"
                  variant="primary"
                  disabled={closeCycle.isPending}
                  onClick={() =>
                    closeCycle.mutate(
                      String(cycleData.publicId ?? cycleData.id),
                    )
                  }
                >
                  إغلاق الدورة
                </Button>
              ) : null
            }
          >
            <dl className="grid gap-4 md:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold text-ink-muted">بداية الدورة</dt>
                <dd className="mt-1 text-sm text-ink-strong">{formatDate(cycleData.startDate ?? cycleData.startsAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-ink-muted">نهاية الدورة</dt>
                <dd className="mt-1 text-sm text-ink-strong">{formatDate(cycleData.endDate ?? cycleData.endsAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-ink-muted">الحالة</dt>
                <dd className="mt-1"><StatusBadge status={text(cycleData.status, "UNKNOWN")} /></dd>
              </div>
            </dl>
          </SectionCard>
        </>
      ) : (
        <EmptyState title="لا توجد دورة فوترة حالية" description="لم يتم إنشاء دورة فوترة بعد." />
      )}

      {breakdownList.length > 0 ? (
        <SectionCard title="توزيع العمولات حسب البائع" description="تفاصيل العمولات في الدورة الحالية مقسمة حسب البائع.">
          <CursorDataTable
            data={breakdownList}
            getRowKey={(row) => String(row.vendorId ?? row.category ?? JSON.stringify(row))}
            columns={[
              { id: "vendor", header: "البائع / التصنيف", cell: (row) => text(row.vendorName ?? row.category) },
              { id: "total", header: "إجمالي العمولة", cell: (row) => formatMoney(row.totalCommissionCents ?? row.commissionCents, "EGP") },
              { id: "orders", header: "الطلبات", cell: (row) => text(row.orderCount, "0") },
              { id: "rate", header: "النسبة", cell: (row) => row.rateBps ? `${(Number(row.rateBps) / 100).toFixed(1)}%` : text(row.rate) },
            ]}
          />
        </SectionCard>
      ) : null}

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
