"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/state/async-states";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { SectionCard } from "@/components/ui/section-card";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import type { BillingOverview } from "@/lib/api/types";
import { formatDate, formatMoney } from "@/lib/formatters";

export function BillingJobsPage() {
  const queryClient = useQueryClient();

  const overview = useQuery({
    queryKey: ["billing", "overview"],
    queryFn: () => adminApi<BillingOverview>(adminPaths.billingOverview()),
  });

  const runBilling = useMutation({
    mutationFn: () =>
      adminApi(adminPaths.vendorBillingRun(), { method: "POST", body: {} }),
    onSuccess: async () => {
      toast.success("تم تشغيل مهمة الفوترة بنجاح");
      await queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر تشغيل مهمة الفوترة"),
  });

  const data = overview.data;
  const currency = data?.currency ?? "EGP";

  return (
    <div className="space-y-6">
      <PageHeader
        title="مهام الفوترة"
        description="تشغيل مهمة توليد الفواتير يدوياً ومراقبة حالة الفوترة الحالية."
        actions={
          <Link
            href="/billing"
            className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted"
          >
            الفوترة الرئيسية
          </Link>
        }
      />

      <SectionCard
        title="تشغيل مهمة الفوترة"
        description="تعمل تلقائياً يوم 1 من كل شهر. هذا الزر يشغّلها يدوياً لتوليد فواتير الشهر السابق وإنفاذ الإيقاف على المتأخرين."
        actions={
          <Button
            type="button"
            variant="primary"
            disabled={runBilling.isPending}
            onClick={() => runBilling.mutate()}
          >
            <Play className="me-1.5 size-4" />
            تشغيل مهمة الفوترة
          </Button>
        }
      />

      <SectionCard title="حالة الفوترة الحالية" description="ملخص حيّ من نظام الفوترة.">
        {overview.isLoading ? (
          <LoadingState label="جار تحميل الحالة" />
        ) : overview.isError ? (
          <ErrorState message={overview.error.message} />
        ) : data ? (
          <dl className="grid gap-4 md:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold text-ink-muted">عمولة {data.currentMonth.label} (تتراكم)</dt>
              <dd className="mt-1 text-sm text-ink-strong">
                {formatMoney(data.currentMonth.accruedCommissionCents, currency)}
                <span className="text-ink-muted"> · {data.currentMonth.orderCount} طلب</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-muted">مستحقات غير مدفوعة</dt>
              <dd className="mt-1 text-sm text-ink-strong">
                {formatMoney(data.outstanding.balanceDueCents, currency)}
                <span className="text-ink-muted"> · {data.outstanding.overdueInvoiceCount} متأخرة</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-muted">متاجر موقوفة</dt>
              <dd className="mt-1 text-sm font-bold text-ink-strong">{data.restrictedVendorCount}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-muted">آخر دورة فوترة</dt>
              <dd className="mt-1 text-sm text-ink-strong">{data.lastBilledPeriod?.label ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-muted">آخر موعد للسداد</dt>
              <dd className="mt-1 text-sm text-ink-strong">
                {data.lastBilledPeriod ? formatDate(data.lastBilledPeriod.graceEndsAt) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-muted">الفاتورة القادمة تُولَّد في</dt>
              <dd className="mt-1 text-sm text-ink-strong">{formatDate(data.currentMonth.nextInvoiceAt)}</dd>
            </div>
          </dl>
        ) : (
          <EmptyState title="لا توجد بيانات" description="تعذر تحميل حالة الفوترة." />
        )}
      </SectionCard>

      {data ? (
        <SectionCard title="البيانات الكاملة" description="البيانات الخام لملخص الفوترة للتشخيص.">
          <CodeBlock>{JSON.stringify(data, null, 2)}</CodeBlock>
        </SectionCard>
      ) : null}
    </div>
  );
}
