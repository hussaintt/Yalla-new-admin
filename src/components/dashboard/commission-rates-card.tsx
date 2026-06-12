"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/state/async-states";

import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { Setting } from "@/lib/api/types";

const RETAIL_KEY = "marketplace.default_retail_commission_bps";
const BULK_KEY = "marketplace.default_bulk_commission_bps";

function bpsToPercent(bps: string | undefined) {
  const n = Number(bps);
  return Number.isFinite(n) ? n / 100 : 1;
}

function percentToBps(pct: number) {
  return String(Math.round(pct * 100));
}

export function CommissionRatesCard() {
  const queryClient = useQueryClient();

  const settings = useQuery({
    queryKey: queryKeys.commissions,
    queryFn: () =>
      adminApi<Setting[]>(adminPaths.adminSettings({ group: "BUSINESS" })),
  });

  const retailSetting = settings.data?.find((s) => s.key === RETAIL_KEY);
  const bulkSetting = settings.data?.find((s) => s.key === BULK_KEY);

  const [retailPct, setRetailPct] = useState<string>("");
  const [bulkPct, setBulkPct] = useState<string>("");
  const [prevSettings, setPrevSettings] = useState<Setting[] | undefined>(undefined);

  if (settings.data && settings.data !== prevSettings) {
    setRetailPct(String(bpsToPercent(retailSetting?.value)));
    setBulkPct(String(bpsToPercent(bulkSetting?.value)));
    setPrevSettings(settings.data);
  }

  const mutation = useMutation({
    mutationFn: (body: { settings: Array<{ key: string; group: string; value: string; type: string }> }) =>
      adminApi(adminPaths.adminSettings(), { method: "PATCH", body }),
    onSuccess: async () => {
      toast.success("تم تحديث نسب العمولة بنجاح");
      await queryClient.invalidateQueries({ queryKey: queryKeys.commissions });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "تعذر تحديث نسب العمولة",
      );
    },
  });

  function handleSave() {
    const retail = Number(retailPct);
    const bulk = Number(bulkPct);
    if (!Number.isFinite(retail) || retail < 0 || retail > 100) {
      toast.error("نسبة العمولة للقطاعي يجب أن تكون بين 0 و 100");
      return;
    }
    if (!Number.isFinite(bulk) || bulk < 0 || bulk > 100) {
      toast.error("نسبة العمولة للجملة يجب أن تكون بين 0 و 100");
      return;
    }
    mutation.mutate({
      settings: [
        { key: RETAIL_KEY, group: "BUSINESS", value: percentToBps(retail), type: "NUMBER" },
        { key: BULK_KEY, group: "BUSINESS", value: percentToBps(bulk), type: "NUMBER" },
      ],
    });
  }

  if (settings.isLoading) {
    return (
      <SectionCard title="نسب العمولة الافتراضية" description="تحكم في نسبة العمولة على جميع المبيعات">
        <LoadingState label="جار التحميل" />
      </SectionCard>
    );
  }
  if (settings.isError) {
    return (
      <SectionCard title="نسب العمولة الافتراضية" description="تحكم في نسبة العمولة على جميع المبيعات">
        <ErrorState message={settings.error.message} />
      </SectionCard>
    );
  }

  const dirty =
    retailPct !== String(bpsToPercent(retailSetting?.value)) ||
    bulkPct !== String(bpsToPercent(bulkSetting?.value));

  return (
    <SectionCard
      title="نسب العمولة الافتراضية"
      description="تُطبق على جميع البائعين الذين ليس لديهم نسبة مخصصة"
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold text-ink-strong">
            قطاعي (%)
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={retailPct}
              onChange={(e) => setRetailPct(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-border bg-muted/40 px-3 py-2.5 text-sm text-ink-strong outline-none transition focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
            />
          </label>
          <label className="block text-sm font-bold text-ink-strong">
            جملة (%)
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={bulkPct}
              onChange={(e) => setBulkPct(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-border bg-muted/40 px-3 py-2.5 text-sm text-ink-strong outline-none transition focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
            />
          </label>
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!dirty || mutation.isPending}
          >
            حفظ التغييرات
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
