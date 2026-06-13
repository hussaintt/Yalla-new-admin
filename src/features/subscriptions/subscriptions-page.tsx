"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Pencil,
  Plus,
  Repeat2,
  Timer,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";

import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { CursorPager } from "@/components/data-table/cursor-pager";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status/status-badge";
import { EntityEditorDrawer } from "@/components/forms/entity-editor-drawer";

import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  SubscriptionExpiringPage,
  SubscriptionsStats,
} from "@/lib/api/types";
import { formatDate, formatMoney, localizedText } from "@/lib/formatters";

const EXPIRING_LIMIT = 20;

const planFormSchema = z.object({
  name: z.object({
    ar: z.string().trim().min(1, "الاسم العربي مطلوب"),
    en: z.string().trim().optional().or(z.literal("")),
  }),
  description: z.object({
    ar: z.string().trim().optional().or(z.literal("")),
    en: z.string().trim().optional().or(z.literal("")),
  }),
  priceCents: z.coerce.number().min(0, "السعر يجب أن يكون 0 أو أكثر"),
  billingInterval: z.string().trim().min(1, "فترة الفوترة مطلوبة"),
  isActive: z.string().default("true"),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

type PlanRecord = {
  id?: string;
  publicId?: string;
  name?: {
    ar?: string;
    en?: string;
  } | string;
  description?: {
    ar?: string;
    en?: string;
  } | string;
  priceCents?: number;
  currency?: string;
  billingInterval?: string;
  isActive?: boolean;
};

function i18nValue(value: unknown, locale: "ar" | "en"): string {
  if (value && typeof value === "object") {
    const localized = (value as Record<string, unknown>)[locale];
    return typeof localized === "string" ? localized : "";
  }
  return locale === "ar" && typeof value === "string" ? value : "";
}

export function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanRecord | null>(null);

  const stats = useQuery({
    queryKey: queryKeys.dashboard.subscriptionsStats,
    queryFn: () =>
      adminApi<SubscriptionsStats>(adminPaths.subscriptionsStats()),
  });

  const expiring = useQuery({
    queryKey: queryKeys.dashboard.subscriptionsExpiring(EXPIRING_LIMIT),
    queryFn: () =>
      adminApi<SubscriptionExpiringPage>(
        adminPaths.subscriptionsExpiring(EXPIRING_LIMIT),
      ),
  });

  const plans = useQuery({
    queryKey: ["/api/admin/admin/subscription-plans"],
    queryFn: () => adminApi<PlanRecord[]>(adminPaths.subscriptionPlans()),
  });

  const upsertPlan = useMutation({
    mutationFn: (values: PlanFormValues) => {
      const isEdit = Boolean(selectedPlan);
      const url = isEdit
        ? adminPaths.subscriptionPlanDetail(String(selectedPlan!.id ?? selectedPlan!.publicId))
        : adminPaths.subscriptionPlans();
      
      const body = {
        name: values.name,
        description: values.description,
        priceCents: Number(values.priceCents),
        billingInterval: values.billingInterval,
        isActive: values.isActive === "true",
      };

      return adminApi(url, {
        method: isEdit ? "PATCH" : "POST",
        body,
      });
    },
    onSuccess: async () => {
      toast.success(selectedPlan ? "تم تحديث الباقة بنجاح" : "تم إنشاء الباقة بنجاح");
      setDrawerOpen(false);
      setSelectedPlan(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/admin/subscription-plans"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ الباقة");
    },
  });

  const currency = stats.data?.currency ?? "EGP";
  const expiringData = expiring.data?.data ?? [];

  const handleEditPlan = (plan: PlanRecord) => {
    setSelectedPlan(plan);
    setDrawerOpen(true);
  };

  const handleCreatePlan = () => {
    setSelectedPlan(null);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="الاشتراكات"
        description="مؤشرات الإيراد المتكرر والاشتراكات التي تنتهي خلال 7 أيام."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          icon={Banknote}
          tone="teal"
          value={formatMoney(stats.data?.mrrCents, currency)}
          label="الإيراد الشهري المتكرر (MRR)"
          footer={<span>العملة: {currency}</span>}
        />
        <KpiCard
          icon={CheckCircle2}
          tone="green"
          value={formatNumber(stats.data?.activeSubscriptionsCount)}
          label="اشتراكات نشطة"
        />
        <KpiCard
          icon={Timer}
          tone="blue"
          value={formatNumber(stats.data?.trialingCount)}
          label="قيد التجربة"
        />
        <KpiCard
          icon={AlertCircle}
          tone="amber"
          value={formatNumber(stats.data?.pastDueCount)}
          label="متأخرة السداد"
        />
        <KpiCard
          icon={XCircle}
          tone="rose"
          value={formatNumber(stats.data?.cancelledCount)}
          label="ملغية"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="اشتراكات تنتهي خلال 7 أيام"
          description="بائعون وباقات على وشك الانتهاء — تواصل معهم للتجديد."
        >
          {expiring.isLoading ? (
            <LoadingState label="جار تحميل الاشتراكات" />
          ) : expiring.isError ? (
            <ErrorState message={expiring.error.message} />
          ) : expiringData.length === 0 ? (
            <div className="grid place-items-center py-10 text-sm text-ink-muted">
              <Repeat2 className="mb-2 size-8 opacity-50" />
              لا توجد اشتراكات تنتهي خلال 7 أيام.
            </div>
          ) : (
            <>
              <CursorDataTable
                data={expiringData}
                getRowKey={(row) => row.subscriptionId}
                columns={[
                  {
                    id: "vendor",
                    header: "البائع",
                    cell: (row) => (
                      <Link
                        href={`/stores/${row.vendorId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.vendorName}
                      </Link>
                    ),
                  },
                  {
                    id: "plan",
                    header: "الباقة",
                    cell: (row) => (
                      <span className="text-ink-strong">{row.planName}</span>
                    ),
                  },
                  {
                    id: "endsAt",
                    header: "تنتهي في",
                    cell: (row) => (
                      <span className="text-sm text-ink-strong">
                        {formatDate(row.endsAt)}
                      </span>
                    ),
                  },
                  {
                    id: "price",
                    header: "السعر",
                    cell: (row) => (
                      <span className="text-sm font-bold text-ink-strong">
                        {formatMoney(row.priceCents, row.currency)}
                      </span>
                    ),
                  },
                ]}
              />
              <CursorPager
                nextCursor={expiring.data?.nextCursor ?? undefined}
                hasMore={expiring.data?.hasMore ?? false}
              />
            </>
          )}
        </SectionCard>

        <SectionCard
          title="باقات الاشتراك (خطط المنصة)"
          description="إدارة باقات الاشتراك المتاحة للبائعين على المنصة."
          actions={
            <Button type="button" size="sm" onClick={handleCreatePlan}>
              <Plus className="me-1 size-4" />
              إضافة باقة
            </Button>
          }
        >
          {plans.isLoading ? (
            <LoadingState label="جار تحميل الباقات" />
          ) : plans.isError ? (
            <ErrorState message={plans.error.message} />
          ) : !plans.data || plans.data.length === 0 ? (
            <div className="grid place-items-center py-10 text-sm text-ink-muted">
              لا توجد باقات اشتراك مضافة حالياً.
            </div>
          ) : (
            <CursorDataTable
              data={plans.data}
              getRowKey={(row) => String(row.publicId ?? row.id)}
              columns={[
                {
                  id: "name",
                  header: "الباقة",
                  cell: (row) => (
                    <div>
                      <div className="font-bold text-ink-strong">
                        {localizedText(row.name, String(row.publicId ?? row.id), "ar")}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {localizedText(row.description, "", "ar")}
                      </div>
                    </div>
                  ),
                },
                {
                  id: "price",
                  header: "السعر",
                  cell: (row) => (
                    <span className="text-sm font-bold text-ink-strong">
                      {formatMoney(row.priceCents, row.currency ?? "EGP")}
                    </span>
                  ),
                },
                {
                  id: "interval",
                  header: "الدورة",
                  cell: (row) => {
                    const intv = String(row.billingInterval ?? "").toUpperCase();
                    return intv === "YEARLY" ? "سنوي" : intv === "MONTHLY" ? "شهري" : intv || "شهري";
                  },
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
                      onClick={() => handleEditPlan(row)}
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
      </section>

      <EntityEditorDrawer<PlanFormValues>
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={selectedPlan ? "تعديل باقة الاشتراك" : "إنشاء باقة اشتراك جديدة"}
        description="حدد اسم الباقة ووصفها وسعرها وفترة الفوترة لتظهر للبائعين."
        schema={planFormSchema}
        pending={upsertPlan.isPending}
        defaultValues={{
          name: {
            ar: i18nValue(selectedPlan?.name, "ar"),
            en: i18nValue(selectedPlan?.name, "en"),
          },
          description: {
            ar: i18nValue(selectedPlan?.description, "ar"),
            en: i18nValue(selectedPlan?.description, "en"),
          },
          priceCents: selectedPlan?.priceCents ?? 0,
          billingInterval: selectedPlan?.billingInterval ?? "MONTHLY",
          isActive: selectedPlan?.isActive === false ? "false" : "true",
        }}
        fields={[
          { name: "name.ar", label: "اسم الباقة (عربي)", required: true },
          { name: "name.en", label: "اسم الباقة (إنجليزي)", dir: "ltr" },
          { name: "description.ar", label: "الوصف (عربي)", kind: "textarea", colSpan: 2 },
          { name: "description.en", label: "الوصف (إنجليزي)", kind: "textarea", colSpan: 2, dir: "ltr" },
          { name: "priceCents", label: "السعر بالقروش (مثال: 5000 = 50 EGP)", kind: "number", required: true },
          {
            name: "billingInterval",
            label: "دورة الفوترة",
            kind: "select",
            options: [
              { value: "MONTHLY", label: "شهري" },
              { value: "YEARLY", label: "سنوي" },
            ],
            required: true,
          },
          {
            name: "isActive",
            label: "الحالة",
            kind: "select",
            options: [
              { value: "true", label: "نشط" },
              { value: "false", label: "غير نشط" },
            ],
            required: true,
          },
        ]}
        onSubmit={(values) => upsertPlan.mutate(values)}
      />
    </div>
  );
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("ar-EG-u-nu-latn").format(value);
}
