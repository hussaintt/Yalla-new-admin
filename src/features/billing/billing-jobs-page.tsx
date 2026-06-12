"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/state/async-states";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { SectionCard } from "@/components/ui/section-card";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { formatDate } from "@/lib/formatters";

type AnyRecord = Record<string, unknown>;

function text(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function BillingJobsPage() {
  const queryClient = useQueryClient();

  const cycle = useQuery({
    queryKey: ["billing", "cycles", "current"],
    queryFn: () => adminApi<AnyRecord>(adminPaths.billingCyclesCurrent()),
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

  const cycleData = cycle.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="مهام الفوترة"
        description="تشغيل مهام الفوترة يدوياً ومراقبة حالة الدورة الحالية."
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
        description="ينفذ توليد الفواتير وإنفاذ قواعد الفوترة من الخلفية. يُنصح بتشغيلها بعد كل إغلاق دورة."
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

      <SectionCard title="حالة الدورة الحالية" description="معلومات الدورة الجارية من نظام الفوترة.">
        {cycle.isLoading ? (
          <LoadingState label="جار تحميل حالة الدورة" />
        ) : cycle.isError ? (
          <ErrorState message={cycle.error.message} />
        ) : cycleData ? (
          <dl className="grid gap-4 md:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold text-ink-muted">معرف الدورة</dt>
              <dd className="mt-1 text-sm text-ink-strong font-mono">{text(cycleData.publicId ?? cycleData.id)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-muted">الحالة</dt>
              <dd className="mt-1"><StatusBadge status={text(cycleData.status, "UNKNOWN")} /></dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-muted">تاريخ الإنشاء</dt>
              <dd className="mt-1 text-sm text-ink-strong">{formatDate(cycleData.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-muted">البداية</dt>
              <dd className="mt-1 text-sm text-ink-strong">{formatDate(cycleData.startDate ?? cycleData.startsAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-muted">النهاية</dt>
              <dd className="mt-1 text-sm text-ink-strong">{formatDate(cycleData.endDate ?? cycleData.endsAt)}</dd>
            </div>
          </dl>
        ) : (
          <EmptyState title="لا توجد دورة فوترة حالية" description="لم يتم إنشاء دورة فوترة بعد." />
        )}
      </SectionCard>

      {cycleData ? (
        <SectionCard title="البيانات الكاملة" description="البيانات الخام للدورة الحالية للتشخيص.">
          <CodeBlock>{JSON.stringify(cycleData, null, 2)}</CodeBlock>
        </SectionCard>
      ) : null}
    </div>
  );
}
