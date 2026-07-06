"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/state/async-states";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";

type AiStudioVendorUsage = {
  vendorId: string;
  displayName?: unknown;
  enhancements: number;
  attempts: number;
  ready: number;
  failed: number;
  approvedAi: number;
  keptOriginal: number;
  quotaOverride: number | null;
  quotaLimit: number;
  estimatedCostUsd: number;
};

type AiStudioUsage = {
  month: string;
  defaultMonthlyQuota: number;
  estimatedCostPerAttemptUsd: number;
  quotaOverridesKey: string;
  quotaOverrides: Record<string, number>;
  vendors: AiStudioVendorUsage[];
};

function vendorName(value: unknown, fallback: string) {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.ar === "string" && record.ar) return record.ar;
    if (typeof record.en === "string" && record.en) return record.en;
  }
  return fallback;
}

export function AiStudioPage() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const usage = useQuery({
    queryKey: ["/api/admin/admin/ai-studio/usage"],
    queryFn: () => adminApi<AiStudioUsage>("/api/admin/admin/ai-studio/usage"),
  });

  const overrideMutation = useMutation({
    mutationFn: (overrides: Record<string, number>) =>
      adminApi(adminPaths.adminSettings(), {
        method: "PATCH",
        body: {
          settings: [
            {
              key: usage.data?.quotaOverridesKey ?? "ai_studio.vendor_quota_overrides",
              group: "VENDOR",
              value: JSON.stringify(overrides),
              type: "JSON",
            },
          ],
        },
      }),
    onSuccess: async () => {
      toast.success("تم تحديث حصة الذكاء الاصطناعي");
      setDrafts({});
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/admin/ai-studio/usage"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الحصة"),
  });

  const saveOverride = (vendorId: string) => {
    const data = usage.data;
    if (!data) return;
    const raw = (drafts[vendorId] ?? "").trim();
    const overrides = { ...data.quotaOverrides };
    if (raw === "") {
      delete overrides[vendorId];
    } else {
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed < 0) {
        toast.error("الحصة يجب أن تكون رقماً صحيحاً 0 أو أكثر");
        return;
      }
      overrides[vendorId] = parsed;
    }
    overrideMutation.mutate(overrides);
  };

  const data = usage.data;
  const totalAttempts = data?.vendors.reduce((sum, v) => sum + v.attempts, 0) ?? 0;
  const totalCost = data?.vendors.reduce((sum, v) => sum + v.estimatedCostUsd, 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="استوديو الصور بالذكاء الاصطناعي"
        description="استهلاك تحسين صور المنتجات (Gemini) لكل بائع خلال الشهر الحالي، مع التكلفة التقديرية وتعديل الحصة الشهرية."
      />
      {usage.isLoading ? (
        <LoadingState label="جار تحميل بيانات الاستخدام" />
      ) : usage.isError ? (
        <ErrorState message={usage.error.message} />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SectionCard title="الشهر" description="نافذة الاحتساب (UTC)">
              <p className="text-2xl font-bold text-ink-strong" dir="ltr">{data.month}</p>
            </SectionCard>
            <SectionCard title="إجمالي المحاولات" description="كل توليد أو إعادة محاولة">
              <p className="text-2xl font-bold text-ink-strong">{totalAttempts}</p>
            </SectionCard>
            <SectionCard title="التكلفة التقديرية" description={`~$${data.estimatedCostPerAttemptUsd} لكل محاولة — تقدير وليس فاتورة`}>
              <p className="text-2xl font-bold text-ink-strong" dir="ltr">${totalCost.toFixed(2)}</p>
            </SectionCard>
            <SectionCard title="الحصة الافتراضية" description="لكل بائع شهرياً ما لم تُخصَّص">
              <p className="text-2xl font-bold text-ink-strong">{data.defaultMonthlyQuota}</p>
            </SectionCard>
          </div>

          <SectionCard
            title="الاستخدام حسب البائع"
            description="عدّل «الحصة الشهرية» لأي بائع ثم احفظ — اترك الحقل فارغاً واحفظ للرجوع إلى الحصة الافتراضية."
          >
            {data.vendors.length === 0 ? (
              <EmptyState title="لا يوجد استخدام بعد" description="لم يستخدم أي بائع استوديو الذكاء الاصطناعي هذا الشهر." />
            ) : (
              <CursorDataTable
                data={data.vendors}
                getRowKey={(row) => row.vendorId}
                columns={[
                  {
                    id: "vendor",
                    header: "البائع",
                    cell: (row) => (
                      <Link href={`/stores/${row.vendorId}`} className="font-medium text-primary hover:underline">
                        {vendorName(row.displayName, row.vendorId)}
                      </Link>
                    ),
                  },
                  { id: "attempts", header: "المحاولات", cell: (row) => <span className="font-bold">{row.attempts}</span> },
                  { id: "ready", header: "ناجحة", cell: (row) => row.ready },
                  { id: "failed", header: "فاشلة", cell: (row) => row.failed },
                  { id: "approved", header: "اعتمد الذكاء", cell: (row) => row.approvedAi },
                  { id: "kept", header: "احتفظ بالأصلية", cell: (row) => row.keptOriginal },
                  {
                    id: "cost",
                    header: "التكلفة التقديرية",
                    cell: (row) => <span dir="ltr">${row.estimatedCostUsd.toFixed(2)}</span>,
                  },
                  {
                    id: "quota",
                    header: "الحصة الشهرية",
                    cell: (row) => (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          className="h-9 w-24 rounded-xl border border-border bg-card px-2 text-sm text-ink-strong"
                          placeholder={String(data.defaultMonthlyQuota)}
                          value={drafts[row.vendorId] ?? (row.quotaOverride === null ? "" : String(row.quotaOverride))}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [row.vendorId]: e.target.value }))
                          }
                          disabled={overrideMutation.isPending}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={overrideMutation.isPending}
                          onClick={() => saveOverride(row.vendorId)}
                        >
                          حفظ
                        </Button>
                        {row.quotaOverride === null ? (
                          <span className="text-xs text-ink-muted">افتراضي ({data.defaultMonthlyQuota})</span>
                        ) : (
                          <span className="text-xs font-bold text-primary">مخصصة</span>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}
