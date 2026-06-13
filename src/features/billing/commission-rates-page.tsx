"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";

import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status/status-badge";
import { EntityEditorDrawer } from "@/components/forms/entity-editor-drawer";
import { CommissionBulkApplyDialog } from "@/features/billing/commission-bulk-apply-dialog";
import { CommissionRatesCard } from "@/components/dashboard/commission-rates-card";
import { CommissionEngineCard } from "@/components/dashboard/commission-engine-card";

import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { Setting } from "@/lib/api/types";
const commissionRateSchema = z.object({
  rateBps: z.coerce
    .number()
    .min(0, "العمولة يجب أن تكون 0 أو أكثر")
    .max(10000, "العمولة لا يمكن أن تتجاوز 100% (10000 bps)"),
  vendorId: z.string().trim().min(1, "حدد معرف البائع"),
  categoryId: z.string().trim().optional().or(z.literal("")),
  isActive: z.string().default("true"),
});

type CommissionRateValues = z.infer<typeof commissionRateSchema>;

type CommRateRecord = {
  id?: string;
  publicId?: string;
  rateBps?: number;
  vendorId?: string;
  vendorName?: string;
  categoryId?: string;
  categoryName?: string;
  isActive?: boolean;
};

export function CommissionRatesPage() {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkKey, setBulkKey] = useState(0);
  const [selectedRule, setSelectedRule] = useState<CommRateRecord | null>(null);

  // Shared with CommissionRatesCard / CommissionEngineCard (same query key) so the
  // legacy backup section appears/disappears the moment the engine is toggled.
  const settings = useQuery({
    queryKey: queryKeys.commissions,
    queryFn: () =>
      adminApi<Setting[]>(adminPaths.adminSettings({ group: "BUSINESS" })),
  });
  const isLegacy =
    settings.data?.find((s) => s.key === "commission.engine")?.value ===
    "legacy";

  const rates = useQuery({
    queryKey: ["/api/admin/admin/commissions/rates"],
    queryFn: () => adminApi<CommRateRecord[]>(adminPaths.commissionsRates()),
    enabled: isLegacy,
  });

  const upsertRate = useMutation({
    mutationFn: (values: CommissionRateValues) => {
      const isEdit = Boolean(selectedRule);
      const url = isEdit
        ? adminPaths.commissionRateDetail(String(selectedRule!.id ?? selectedRule!.publicId))
        : adminPaths.commissionsRates();

      const body = {
        rateBps: Number(values.rateBps),
        vendorId: values.vendorId || null,
        categoryId: values.categoryId || null,
        isActive: values.isActive === "true",
      };

      return adminApi(url, {
        method: isEdit ? "PATCH" : "POST",
        body,
      });
    },
    onSuccess: async () => {
      toast.success(selectedRule ? "تم تحديث قاعدة العمولة بنجاح" : "تم إنشاء قاعدة العمولة بنجاح");
      setDrawerOpen(false);
      setSelectedRule(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/admin/commissions/rates"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ قاعدة العمولة");
    },
  });

  const handleEditRate = (rule: CommRateRecord) => {
    setSelectedRule(rule);
    setDrawerOpen(true);
  };

  const handleCreateRate = () => {
    setSelectedRule(null);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="عمولة المنصة"
        description="قيمتان فقط — عمولة القطاعي وعمولة الجملة — تُطبَّقان على كل البائعين وكل الطلبات في التطبيق."
      />

      <div className="flex flex-wrap gap-2">
        <Link href="/billing/overview" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">نظرة عامة</Link>
        <Link href="/billing/vendors" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">حسابات البائعين</Link>
        <Link href="/billing/invoices" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">الفواتير</Link>
        <Link href="/billing/payments" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">دفعات الفوترة</Link>
        <Link href="/billing/jobs" className="inline-flex h-10 items-center rounded-2xl border border-border bg-card px-4 text-sm font-bold text-ink-strong shadow-sm transition hover:bg-muted">المهام</Link>
        <Link href="/billing/commission-rates" className="inline-flex h-10 items-center rounded-2xl border border-primary bg-primary-soft px-4 text-sm font-bold text-primary shadow-sm transition">العمولة</Link>
      </div>

      {/* Primary control: the two values that drive the whole app. */}
      <CommissionRatesCard />

      {/* Switch between the simple system and the legacy backup engine. */}
      <CommissionEngineCard />

      {settings.isLoading ? null : isLegacy ? (
        <>
          <SectionCard
            title="قواعد عمولات مخصصة (النظام القديم — احتياطي)"
            description="نشط فقط عندما يكون نظام العمولة مضبوطاً على «القديم». تُطبَّق النسبة الأكثر تخصيصاً أولاً (قاعدة البائع + التصنيف، ثم البائع فقط، ثم التصنيف فقط، وأخيراً النسبة العامة للمنصة)."
            actions={
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setBulkKey((k) => k + 1);
                    setBulkOpen(true);
                  }}
                >
                  <Users className="me-1 size-4" />
                  تطبيق على عدة بائعين
                </Button>
                <Button type="button" size="sm" onClick={handleCreateRate}>
                  <Plus className="me-1 size-4" />
                  إضافة قاعدة عمولة
                </Button>
              </div>
            }
          >
            {rates.isLoading ? (
              <LoadingState label="جار تحميل قواعد العمولات" />
            ) : rates.isError ? (
              <ErrorState message={rates.error.message} />
            ) : !rates.data || rates.data.length === 0 ? (
              <div className="grid place-items-center py-10 text-sm text-ink-muted">
                لا توجد قواعد عمولات مضافة حالياً. سيتم استخدام النسبة الافتراضية للبائعين.
              </div>
            ) : (
              <CursorDataTable
                data={rates.data}
                getRowKey={(row) => String(row.publicId ?? row.id)}
                columns={[
                  {
                    id: "bps",
                    header: "النسبة",
                    cell: (row) => (
                      <span className="font-bold text-primary">
                        {(Number(row.rateBps ?? 0) / 100).toFixed(2)}%
                        <span className="text-xs font-normal text-ink-muted"> ({row.rateBps} bps)</span>
                      </span>
                    ),
                  },
                  {
                    id: "vendor",
                    header: "البائع المستهدف",
                    cell: (row) => (
                      row.vendorId ? (
                        <Link href={`/stores/${row.vendorId}`} className="font-medium text-primary hover:underline">
                          {row.vendorName ?? row.vendorId}
                        </Link>
                      ) : (
                        <span className="text-xs text-ink-muted">كل البائعين</span>
                      )
                    ),
                  },
                  {
                    id: "category",
                    header: "التصنيف المستهدف",
                    cell: (row) => (
                      row.categoryId ? (
                        <span className="font-medium text-ink-strong">{row.categoryName ?? row.categoryId}</span>
                      ) : (
                        <span className="text-xs text-ink-muted">كل التصنيفات</span>
                      )
                    ),
                  },
                  {
                    id: "status",
                    header: "الحالة",
                    cell: (row) => (
                      <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} />
                    ),
                  },
                  {
                    id: "actions",
                    header: "إجراءات",
                    cell: (row) => (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEditRate(row)}
                      >
                        <Pencil className="size-3.5" />
                        تعديل
                      </Button>
                    ),
                  },
                ]}
              />
            )}
          </SectionCard>

          <EntityEditorDrawer<CommissionRateValues>
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            title={selectedRule ? "تعديل قاعدة العمولة" : "إضافة قاعدة عمولة جديدة"}
            description="حدد نسبة العمولة بالنقاط (مثال: 10% = 1000 bps) ونطاق تطبيقها."
            schema={commissionRateSchema}
            pending={upsertRate.isPending}
            defaultValues={{
              rateBps: selectedRule?.rateBps ?? 105,
              vendorId: selectedRule?.vendorId ?? "",
              categoryId: selectedRule?.categoryId ?? "",
              isActive: selectedRule?.isActive === false ? "false" : "true",
            }}
            fields={[
              {
                name: "rateBps",
                label: "نسبة العمولة بالنقاط (1% = 100 bps، 10% = 1000 bps)",
                kind: "number",
                required: true,
              },
              {
                name: "vendorId",
                label: "معرف البائع (مطلوب)",
                placeholder: "مثال: vend_12345",
                required: true,
              },
              {
                name: "categoryId",
                label: "معرف التصنيف (اختياري - اترك فارغاً لتطبيق النسبة على كل تصنيفات البائع)",
                placeholder: "مثال: cat_12345",
              },
              {
                name: "isActive",
                label: "حالة القاعدة",
                kind: "select",
                options: [
                  { value: "true", label: "نشط" },
                  { value: "false", label: "غير نشط" },
                ],
                required: true,
              },
            ]}
            onSubmit={(values) => upsertRate.mutate(values)}
          />

          <CommissionBulkApplyDialog
            key={bulkKey}
            open={bulkOpen}
            onOpenChange={setBulkOpen}
            onApplied={() => {
              void queryClient.invalidateQueries({ queryKey: ["/api/admin/admin/commissions/rates"] });
            }}
          />
        </>
      ) : (
        <SectionCard title="قواعد عمولات مخصصة" description="النظام القديم (احتياطي)">
          <div className="grid place-items-center py-8 text-center text-sm text-ink-muted">
            النظام المبسّط مُفعّل: تُطبَّق القيمتان أعلاه على الجميع، وقواعد العمولة المخصصة لكل بائع
            معطّلة. فعِّل «النظام القديم» من البطاقة أعلاه لإدارتها كاحتياطي.
          </div>
        </SectionCard>
      )}
    </div>
  );
}
