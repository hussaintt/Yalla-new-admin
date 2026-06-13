"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { SectionCard } from "@/components/ui/section-card";
import { Switch } from "@/components/ui/switch";
import { ErrorState, LoadingState } from "@/components/state/async-states";

import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { Setting } from "@/lib/api/types";

const ENGINE_KEY = "commission.engine";

/**
 * Selects the active commission engine:
 *  - simple (default): two platform rates (retail + bulk) apply to the whole app.
 *  - legacy (backup): the old per-vendor / per-category rule engine.
 */
export function CommissionEngineCard() {
  const queryClient = useQueryClient();

  const settings = useQuery({
    queryKey: queryKeys.commissions,
    queryFn: () =>
      adminApi<Setting[]>(adminPaths.adminSettings({ group: "BUSINESS" })),
  });

  const engine =
    settings.data?.find((s) => s.key === ENGINE_KEY)?.value === "legacy"
      ? "legacy"
      : "simple";

  const mutation = useMutation({
    mutationFn: (value: "simple" | "legacy") =>
      adminApi(adminPaths.adminSettings(), {
        method: "PATCH",
        body: {
          settings: [
            { key: ENGINE_KEY, group: "BUSINESS", value, type: "STRING" },
          ],
        },
      }),
    onSuccess: async () => {
      toast.success("تم تحديث نظام احتساب العمولة");
      await queryClient.invalidateQueries({ queryKey: queryKeys.commissions });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "تعذر تحديث نظام العمولة",
      );
    },
  });

  if (settings.isLoading) {
    return (
      <SectionCard title="نظام احتساب العمولة">
        <LoadingState label="جار التحميل" />
      </SectionCard>
    );
  }
  if (settings.isError) {
    return (
      <SectionCard title="نظام احتساب العمولة">
        <ErrorState message={settings.error.message} />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="نظام احتساب العمولة"
      description="النظام المبسّط يطبّق نسبتين فقط على كل التطبيق. النظام القديم يبقى كاحتياطي."
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-ink-strong">
            {engine === "simple"
              ? "النظام المبسّط (قيمتان فقط)"
              : "النظام القديم (احتياطي)"}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {engine === "simple"
              ? "نسبتان فقط (قطاعي + جملة) تُطبَّقان على جميع البائعين وكل الطلبات. يتم تجاهل أي قواعد عمولة مخصصة."
              : "نظام القواعد المخصصة لكل بائع/تصنيف. مخصص للحالات الاستثنائية فقط."}
          </p>
        </div>
        <Switch
          checked={engine === "simple"}
          disabled={mutation.isPending}
          onCheckedChange={(checked) =>
            mutation.mutate(checked ? "simple" : "legacy")
          }
          aria-label="تبديل نظام احتساب العمولة"
        />
      </div>
    </SectionCard>
  );
}
