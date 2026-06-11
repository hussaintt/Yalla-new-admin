import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HardDrive, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { formatBytes } from "@/components/ui/bytes";

import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  MediaOrphansPage,
  MediaPurgeResponse,
} from "@/lib/api/types";
import { formatDate } from "@/lib/formatters";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { cn } from "@/lib/utils";

const ORPHAN_LIMIT = 20;

function formatNumber(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("ar-EG").format(value);
}

export function MediaPage() {
  const queryClient = useQueryClient();
  const { confirm, element: confirmElement } = useConfirmDialog();

  const orphans = useQuery({
    queryKey: queryKeys.dashboard.mediaOrphans(ORPHAN_LIMIT),
    queryFn: () =>
      adminApi<MediaOrphansPage>(adminPaths.mediaOrphans(ORPHAN_LIMIT)),
  });

  const purge = useMutation({
    mutationFn: () =>
      adminApi<MediaPurgeResponse>(adminPaths.mediaPurge(), {
        method: "DELETE",
      }),
    onSuccess: async (data) => {
      toast.success(
        `تم تنظيف ${formatNumber(data.purgedCount)} ملف (${formatBytes(
          data.spaceSavedBytes,
        )})`,
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.mediaOrphans(ORPHAN_LIMIT),
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "تعذر تنظيف الملفات",
      );
    },
  });

  const rows = orphans.data?.data ?? [];
  const totalSize = rows.reduce((sum, row) => sum + (row.sizeBytes ?? 0), 0);

  async function handlePurge() {
    if (rows.length === 0) return;
    const result = await confirm({
      title: "تنظيف كل الملفات اليتيمة",
      description: `سيتم حذف ${formatNumber(rows.length)} ملف نهائياً من القرص. هذه العملية لا يمكن التراجع عنها.`,
      confirmLabel: "تنفيذ التنظيف",
      variant: "danger",
      requireReason: true,
      reasonLabel: "سبب التنظيف",
      reasonPlaceholder: "اكتب سبب التنظيف ليظهر في سجل التدقيق",
    });
    if (result.confirmed) purge.mutate();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الوسائط والتخزين"
        description="الملفات اليتيمة في الكتالوج وملفات البائعين — راجعها ثم نظفها لتحرير المساحة."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => orphans.refetch()}
              disabled={orphans.isFetching}
            >
              <RefreshCw
                className={cn(
                  "size-4",
                  orphans.isFetching && "animate-spin",
                )}
              />
              تحديث
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handlePurge}
              disabled={rows.length === 0 || purge.isPending}
            >
              <Trash2 className="size-4" />
              تنظيف الكل
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 grid size-11 place-items-center rounded-xl bg-brand-amber-50 text-brand-amber">
            <HardDrive className="size-5" />
          </div>
          <div className="text-[26px] font-extrabold text-ink-strong">
            {formatNumber(orphans.data?.data.length ?? rows.length)}
          </div>
          <div className="text-xs text-ink-muted">ملفات يتيمة مكتشفة</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 grid size-11 place-items-center rounded-xl bg-brand-blue-50 text-brand-blue">
            <HardDrive className="size-5" />
          </div>
          <div className="text-[26px] font-extrabold text-ink-strong">
            {formatBytes(totalSize)}
          </div>
          <div className="text-xs text-ink-muted">حجم قابل للاسترداد</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 grid size-11 place-items-center rounded-xl bg-brand-rose-50 text-brand-rose">
            <Trash2 className="size-5" />
          </div>
          <div className="text-[26px] font-extrabold text-ink-strong">
            {formatNumber(orphans.data?.data.length)}
          </div>
          <div className="text-xs text-ink-muted">سيتم حذفها عند التنظيف</div>
        </div>
      </section>

      <SectionCard
        title="قائمة الملفات اليتيمة"
        description="ملفات مرفوعة لم تعد مرتبطة بأي منتج أو بائع أو طلب."
      >
        {orphans.isLoading ? (
          <LoadingState label="جار تحميل الملفات" />
        ) : orphans.isError ? (
          <ErrorState message={orphans.error.message} />
        ) : rows.length === 0 ? (
          <div className="grid place-items-center py-10 text-sm text-ink-muted">
            <HardDrive className="mb-2 size-8 opacity-50" />
            لا توجد ملفات يتيمة.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li
                key={row.id}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 py-3"
              >
                <div>
                  <div className="text-sm font-bold text-ink-strong">
                    {row.filename}
                  </div>
                  <div className="text-[11px] text-ink-muted" dir="ltr">
                    {row.mimeType}
                  </div>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-ink-muted">
                  {row.purpose}
                </span>
                <span className="text-sm font-bold text-ink-strong" dir="ltr">
                  {formatBytes(row.sizeBytes)}
                </span>
                <span className="text-xs text-ink-muted">
                  {formatDate(row.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {confirmElement}
    </div>
  );
}
