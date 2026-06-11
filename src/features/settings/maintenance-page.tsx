"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { ActionDialog } from "@/components/modals/action-dialog";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { Switch } from "@/components/ui/switch";

import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  MaintenancePayload,
  MaintenanceSettings,
} from "@/lib/api/types";
import { formatDate } from "@/lib/formatters";

export function MaintenancePage() {
  const queryClient = useQueryClient();
  const current = useQuery({
    queryKey: queryKeys.dashboard.maintenance,
    queryFn: () =>
      adminApi<MaintenanceSettings>(adminPaths.settingsMaintenance()),
  });

  const [enabled, setEnabled] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<MaintenancePayload | null>(null);

  // Sync form fields when the freshly-loaded maintenance settings arrive.
  // We avoid the render-phase setState pattern by only updating when the
  // values are still at their initial defaults — once the user starts
  // editing, we don't clobber their input.
  if (
    current.data &&
    current.data.enabled !== enabled &&
    !confirmOpen
  ) {
    setEnabled(current.data.enabled);
    setBannerMessage(current.data.bannerMessage ?? "");
  }

  const mutation = useMutation({
    mutationFn: (payload: MaintenancePayload) =>
      adminApi<MaintenanceSettings>(adminPaths.settingsMaintenance(), {
        method: "PATCH",
        body: payload,
      }),
    onSuccess: async (data) => {
      toast.success(
        data.enabled ? "تم تفعيل وضع الصيانة" : "تم إلغاء وضع الصيانة",
      );
      setConfirmOpen(false);
      setPendingPayload(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.maintenance,
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "تعذر تحديث وضع الصيانة",
      );
    },
  });

  function handleSubmit() {
    const payload: MaintenancePayload = {
      enabled,
      bannerMessage: bannerMessage.trim(),
    };
    setPendingPayload(payload);
    setConfirmOpen(true);
  }

  if (current.isLoading) {
    return <LoadingState label="جار تحميل الإعدادات" />;
  }
  if (current.isError) {
    return <ErrorState message={current.error.message} />;
  }

  const dirty =
    enabled !== current.data?.enabled ||
    bannerMessage.trim() !== (current.data?.bannerMessage ?? "").trim();

  return (
    <div className="space-y-6">
      <PageHeader
        title="وضع الصيانة"
        description="قفل المنصة مؤقتاً أمام المستخدمين أو عرض رسالة تنبيه."
      />

      <SectionCard
        title="الإعدادات الحالية"
        description="قم بتعديل حالة الصيانة ونص الرسالة ثم اضغط حفظ."
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-muted/30 p-4">
            <div>
              <div className="text-sm font-bold text-ink-strong">
                تفعيل وضع الصيانة
              </div>
              <div className="text-xs text-ink-muted">
                عند التفعيل، يتم قفل الوصول للمستخدمين وعرض الرسالة المحددة.
              </div>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              aria-label="تفعيل وضع الصيانة"
            />
          </div>

          <label className="block text-sm font-bold text-ink-strong">
            رسالة التنبيه
            <textarea
              value={bannerMessage}
              onChange={(event) => setBannerMessage(event.target.value)}
              rows={4}
              maxLength={500}
              placeholder="مثال: المنصة في وضع الصيانة المجدولة حالياً. سنعود للعمل قريباً."
              className="mt-2 w-full resize-none rounded-2xl border border-border bg-muted/40 px-3 py-3 text-sm text-ink-strong outline-none transition focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
            />
            <span className="mt-1 block text-[11px] text-ink-muted">
              ستظهر هذه الرسالة في الواجهة كشريط تنبيه.
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="text-[11px] text-ink-muted">
              آخر تحديث: {formatDate(current.data?.updatedAt)}
            </div>
            <Button
              size="md"
              onClick={handleSubmit}
              disabled={!dirty || mutation.isPending}
            >
              {enabled ? "حفظ وتفعيل الصيانة" : "حفظ التغييرات"}
            </Button>
          </div>
        </div>
      </SectionCard>

      <ActionDialog
        open={confirmOpen}
        title={pendingPayload?.enabled ? "تأكيد تفعيل وضع الصيانة" : "حفظ التغييرات"}
        description={
          pendingPayload?.enabled
            ? "سيتم قفل المنصة أمام المستخدمين. يتطلب تفعيلها توضيح السبب في سجل التدقيق."
            : "سيتم تحديث الرسالة وحالة الصيانة."
        }
        confirmLabel={pendingPayload?.enabled ? "تفعيل الصيانة" : "حفظ"}
        variant={pendingPayload?.enabled ? "danger" : "default"}
        requireReason={pendingPayload?.enabled ?? false}
        reasonLabel="السبب"
        reasonPlaceholder="سبب تفعيل وضع الصيانة (يظهر في سجل التدقيق)"
        disabled={mutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={(reason) => {
          if (!pendingPayload) return;
          mutation.mutate({
            enabled: pendingPayload.enabled,
            bannerMessage: pendingPayload.bannerMessage,
            ...(reason ? { reason } : {}),
          });
        }}
      />
    </div>
  );
}
