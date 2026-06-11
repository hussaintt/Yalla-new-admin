"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  CreditCard,
  Download,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { useCurrentAdmin } from "@/features/auth/use-current-admin";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import { KpiCard, type KpiTone } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";

import { BillingCycleCard } from "@/components/dashboard/billing-cycle-card";
import { FunnelCard } from "@/components/dashboard/funnel-card";
import { KycApprovalQueue, useKycQueue } from "@/components/dashboard/kyc-approval-queue";

import { ActivityFeed, useActivityFeed } from "@/components/dashboard/activity-feed";
import { TopVendorsCard } from "@/components/dashboard/top-vendors";
import { VendorGeoCard } from "@/components/dashboard/vendor-geo";
import { RecentVendorsTable } from "@/components/dashboard/recent-vendors-table";
import { SystemAlertsCard } from "@/components/dashboard/system-alerts";
import { SystemHealthCard } from "@/components/dashboard/system-health";
import { PendingPayoutsCard } from "@/components/dashboard/pending-payouts";

import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  ActiveAlertsCount,
  AnalyticsOverview,
  PendingPayoutsTotal,
  QueueSnapshot,
  SystemAlert,
  SystemAlerts as SystemAlertsData,
  SystemHealth,
  WelcomeSummary,
} from "@/lib/api/types";
import { formatMoney, localizedText } from "@/lib/formatters";

function todayArabic() {
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export default function DashboardPage() {
  const { data: admin } = useCurrentAdmin();
  const adminName =
    localizedText(admin?.fullName, admin?.name ?? admin?.email ?? "صاحب المنصة", "ar") ||
    admin?.email?.split("@")[0] ||
    "صاحب المنصة";

  const [live, setLive] = useState(true);

  const overview = useQuery({
    queryKey: queryKeys.dashboard.overview(30),
    queryFn: () => adminApi<AnalyticsOverview>(adminPaths.analyticsOverview(30)),
  });
  const welcome = useQuery({
    queryKey: queryKeys.dashboard.welcomeSummary(30),
    queryFn: () => adminApi<WelcomeSummary>(adminPaths.analyticsWelcomeSummary(30)),
  });
  const payoutsTotal = useQuery({
    queryKey: queryKeys.dashboard.pendingPayoutsTotal,
    queryFn: () => adminApi<PendingPayoutsTotal>(adminPaths.analyticsPendingPayoutsTotal()),
  });
  const activeAlerts = useQuery({
    queryKey: queryKeys.dashboard.activeAlertsCount,
    queryFn: () => adminApi<ActiveAlertsCount>(adminPaths.analyticsActiveAlertsCount()),
  });
  const queues = useQuery({
    queryKey: queryKeys.dashboard.queues,
    queryFn: () => adminApi<QueueSnapshot>(adminPaths.opsQueues()),
  });
  const systemAlerts = useQuery({
    queryKey: queryKeys.dashboard.systemAlerts(undefined, 4),
    queryFn: () => adminApi<SystemAlertsData>(adminPaths.opsAlerts(undefined, 4)),
  });
  const systemHealth = useQuery({
    queryKey: queryKeys.dashboard.systemHealth,
    queryFn: () => adminApi<SystemHealth>(adminPaths.opsHealth()),
  });
  const kycQueue = useKycQueue(4);
  const activityFeed = useActivityFeed(6);

  const queueSummary = useMemo(() => {
    if (!queues.data) return [];
    if (Array.isArray((queues.data as { queues?: unknown[] }).queues)) {
      return ((queues.data as { queues: Array<{ name: string; waiting?: number; failed?: number }> })
        .queues ?? []
      ).slice(0, 5);
    }
    return Object.entries(queues.data)
      .slice(0, 5)
      .map(([name, value]) => ({
        name,
        waiting: typeof value === "object" && value && "waiting" in value ? Number((value as { waiting?: number }).waiting ?? 0) : 0,
        failed: typeof value === "object" && value && "failed" in value ? Number((value as { failed?: number }).failed ?? 0) : 0,
      }));
  }, [queues.data]);

  if (overview.isLoading) {
    return <LoadingState label="جار تحميل لوحة التحكم" />;
  }
  if (overview.isError) {
    return <ErrorState message={overview.error.message} />;
  }

  const currency = overview.data?.revenue?.currency ?? welcome.data?.currency ?? "EGP";

  const kpis: Array<{
    label: string;
    value: string;
    tone: KpiTone;
    icon: React.ElementType;
    trend?: { direction: "up" | "down"; label: string } | null;
    footer: React.ReactNode;
  }> = [
    {
      label: "إجمالي إيرادات المنصة (الشهر)",
      value: formatMoney(overview.data?.revenue?.grossCents, currency),
      icon: Banknote,
      tone: "teal",
      trend: { direction: "up", label: "23.5%" },
      footer: (
        <>
          <span>الهدف: 3.2M ج.م</span>
          <span className="ms-auto font-bold text-success">89.7%</span>
        </>
      ),
    },
    {
      label: "عمولات محصلة من البائعين",
      value: formatMoney(welcome.data?.commissionInWindowCents, currency),
      icon: Wallet,
      tone: "orange",
      trend: { direction: "up", label: "18.2%" },
      footer: <span>متوسط العمولة: 10%</span>,
    },
    {
      label: "بائع نشط على المنصة",
      value: formatNumber(overview.data?.vendors?.approved),
      icon: Store,
      tone: "purple",
      trend: { direction: "up", label: `+${welcome.data?.newVendorsInWindow ?? 0}` },
      footer: (
        <span className="ms-auto font-bold text-brand-orange">
          {overview.data?.vendors?.pending ?? 0} في انتظار الموافقة
        </span>
      ),
    },
    {
      label: "إجمالي الطلبات هذا الشهر",
      value: formatNumber(welcome.data?.ordersInWindow),
      icon: ShoppingBag,
      tone: "blue",
      trend: { direction: "up", label: "12.4%" },
      footer: <span>معدل الإكتمال: 94.2%</span>,
    },
    {
      label: "عملاء مسجلين",
      value: formatNumber(overview.data?.users?.total),
      icon: Users,
      tone: "green",
      trend: { direction: "up", label: `+${formatNumber(overview.data?.users?.createdInWindow)}` },
      footer: <span>{formatNumber(overview.data?.users?.createdInWindow)} عميل جديد</span>,
    },
    {
      label: "مدفوعات معلقة للبائعين",
      value: formatMoney(payoutsTotal.data?.amountCents, payoutsTotal.data?.currency ?? currency),
      icon: CreditCard,
      tone: "pink",
      trend: { direction: "down", label: "4.2%" },
      footer: (
        <span className="ms-auto font-bold text-destructive">تحتاج إجراء</span>
      ),
    },
    {
      label: "طلبات KYC قيد المراجعة",
      value: formatNumber(overview.data?.vendors?.pending ?? welcome.data?.pendingKyc),
      icon: ShieldCheck,
      tone: "amber",
      trend: { direction: "up", label: `+${formatNumber(overview.data?.vendors?.pending ?? 0)}` },
      footer: <span>أقدم طلب: 3 أيام</span>,
    },
    {
      label: "تحذيرات وتحقيقات نشطة",
      value: formatNumber(activeAlerts.data?.total ?? welcome.data?.activeAlerts),
      icon: AlertTriangle,
      tone: "rose",
      trend: { direction: "down", label: `-${formatNumber(activeAlerts.data?.critical ?? 0)}` },
      footer: (
        <span className="ms-auto font-bold text-destructive">عالية الأولوية</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`أهلاً ${adminName}، منصتك بتنمو بقوة`}
        description="مؤشرات السوق، قوائم الاعتماد، إشارات الإيراد، وآخر نشاط إداري."
        date={todayArabic()}
      />

      

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((card) => (
          <KpiCard
            key={card.label}
            icon={card.icon}
            tone={card.tone}
            value={card.value}
            label={card.label}
            trend={card.trend ?? null}
            footer={card.footer}
          />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <SectionCard
          title="دورة الفوترة الحالية"
          description={welcome.data?.currency ?? currency}
        >
          <BillingCycleCard />
        </SectionCard>
        <SectionCard
          title="احصائيات التطبيق"
          description="من زيارة الصفحة إلى طلب مكتمل"
        >
          <FunnelCard />
        </SectionCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <KycApprovalQueue
          rows={kycQueue.data ?? []}
          isLoading={kycQueue.isLoading}
          isError={kycQueue.isError}
          errorMessage={kycQueue.error?.message}
        />
        <ActivityFeed
          items={activityFeed.data ?? []}
          isLoading={activityFeed.isLoading}
          isError={activityFeed.isError}
          errorMessage={activityFeed.error?.message}
          live={live}
          onLiveToggle={setLive}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <TopVendorsCard />
        <VendorGeoCard />
      </section>

      <RecentVendorsTable />

      <section className="grid gap-5 xl:grid-cols-2">
        <SystemAlertsCard
          alerts={systemAlerts.data?.data ?? ([] as SystemAlert[])}
          isLoading={systemAlerts.isLoading}
          isError={systemAlerts.isError}
          errorMessage={systemAlerts.error?.message}
        />
        <SystemHealthCard
          data={systemHealth.data}
          isLoading={systemHealth.isLoading}
          isError={systemHealth.isError}
          errorMessage={systemHealth.error?.message}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <PendingPayoutsCard />
        <SectionCard
          title="صحة الطوابير"
          description="حالة المعالجة الفورية"
        >
          {queues.isLoading ? (
            <LoadingState label="جار التحميل" />
          ) : queues.isError ? (
            <ErrorState message={queues.error.message} />
          ) : queueSummary.length === 0 ? (
            <p className="text-sm text-ink-muted">لا توجد بيانات طوابير.</p>
          ) : (
            <div className="space-y-2.5">
              {queueSummary.map((queue, index) => (
                <div
                  key={String(queue.name ?? index)}
                  className="flex items-center justify-between rounded-xl border border-border p-3"
                >
                  <div>
                    <div className="text-sm font-bold text-ink-strong">
                      {String(queue.name ?? `طابور ${index + 1}`)}
                    </div>
                    <div className="mt-0.5 text-[11px] text-ink-muted">
                      انتظار: {String(queue.waiting ?? 0)} • فشل: {String(queue.failed ?? 0)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-brand-teal-50 text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Download className="size-3" />
                    تنزيل
                  </Button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </section>
    </div>
  );
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("ar-EG").format(value);
}


