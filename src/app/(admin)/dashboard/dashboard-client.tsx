"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Banknote,
  ClipboardCheck,
  CreditCard,
  Home,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { useCurrentAdmin } from "@/features/auth/use-current-admin";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import { KpiCard, type KpiTone } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { WelcomeBanner } from "@/components/ui/welcome-banner";

import { ActionStrip } from "@/components/dashboard/action-strip";
import {
  SectionAnchorNav,
  type AnchorSection,
} from "@/components/dashboard/section-anchor-nav";
import { BillingCycleCard } from "@/components/dashboard/billing-cycle-card";
import { CommissionRatesCard } from "@/components/dashboard/commission-rates-card";
import { KycApprovalQueue, useKycQueue } from "@/components/dashboard/kyc-approval-queue";
import { ActivityFeed, useActivityFeed } from "@/components/dashboard/activity-feed";
import { TopVendorsCard } from "@/components/dashboard/top-vendors";
import { VendorGeoCard } from "@/components/dashboard/vendor-geo";
import { RecentVendorsTable } from "@/components/dashboard/recent-vendors-table";
import { SystemAlertsCard } from "@/components/dashboard/system-alerts";
import { SystemHealthCard } from "@/components/dashboard/system-health";
import { PendingPayoutsCard } from "@/components/dashboard/pending-payouts";
import { FunnelCard } from "@/components/dashboard/funnel-card";

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
import { cn } from "@/lib/utils";

function todayArabic() {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("ar-EG-u-nu-latn").format(value);
}

const ANCHOR_SECTIONS: AnchorSection[] = [
  { id: "overview", label: "النشاط العام", icon: Home },
  { id: "financials", label: "المالية والعمولات", icon: Banknote },
  { id: "sellers", label: "أداء البائعين", icon: Store },
  { id: "system", label: "صحة النظام", icon: Activity },
];

export default function DashboardPage() {
  const { data: admin } = useCurrentAdmin();
  const adminName =
    localizedText(admin?.fullName, admin?.name ?? admin?.email ?? "صاحب المنصة", "ar") ||
    admin?.email?.split("@")[0] ||
    "صاحب المنصة";

  const [live, setLive] = useState(true);
  const [activeSection, setActiveSection] = useState<string>("overview");

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
  const kycQueue = useKycQueue(4, live);
  const activityFeed = useActivityFeed(6, live);

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
        waiting:
          typeof value === "object" && value && "waiting" in value
            ? Number((value as { waiting?: number }).waiting ?? 0)
            : 0,
        failed:
          typeof value === "object" && value && "failed" in value
            ? Number((value as { failed?: number }).failed ?? 0)
            : 0,
      }));
  }, [queues.data]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    ANCHOR_SECTIONS.forEach((section) => {
      const node = document.getElementById(section.id);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);

  const currency = overview.data?.revenue?.currency ?? welcome.data?.currency ?? "EGP";

  const pendingKyc = overview.data?.vendors?.pending ?? welcome.data?.pendingKyc ?? 0;
  const pendingPayoutsCount = payoutsTotal.data?.vendorCount ?? 0;
  const criticalAlerts = activeAlerts.data?.critical ?? 0;
  const failedQueueJobs = useMemo(
    () => queueSummary.reduce((acc, q) => acc + (q.failed ?? 0), 0),
    [queueSummary],
  );
  const totalAlerts = activeAlerts.data?.total ?? welcome.data?.activeAlerts ?? 0;

  const revenueCents = overview.data?.revenue?.grossCents ?? null;
  const ordersInWindow = welcome.data?.ordersInWindow ?? null;
  const aovCents = useMemo(() => {
    if (revenueCents == null || !ordersInWindow || ordersInWindow <= 0) return null;
    return Math.round(revenueCents / ordersInWindow);
  }, [revenueCents, ordersInWindow]);

  const bannerHasAction = pendingKyc > 0 || totalAlerts > 0;
  const bannerDescription = bannerHasAction
    ? `لديك ${formatNumber(pendingKyc)} طلبات KYC معلقة للمراجعة، و ${formatNumber(totalAlerts)} تنبيهات نشطة بالنظام.`
    : "كل المؤشرات في وضعها الطبيعي اليوم.";

  type KpiDef = {
    key: string;
    label: string;
    value: React.ReactNode;
    icon: LucideIcon;
    tone: KpiTone;
    trend?: { direction: "up" | "down"; label: string } | null;
    footer?: React.ReactNode;
    size?: "md" | "lg";
    loading?: boolean;
  };

  const headlineKpis: KpiDef[] = [
    {
      key: "revenue",
      label: "إجمالي إيرادات المنصة (30 يوم)",
      value: formatMoney(revenueCents, currency),
      icon: Banknote,
      tone: "teal",
      size: "lg",
      loading: overview.isLoading,
    },
    {
      key: "commission",
      label: "عمولات محصلة من البائعين",
      value: formatMoney(welcome.data?.commissionInWindowCents, currency),
      icon: Wallet,
      tone: "orange",
      size: "lg",
      loading: welcome.isLoading,
    },
    {
      key: "orders",
      label: "إجمالي الطلبات (30 يوم)",
      value: formatNumber(ordersInWindow),
      icon: ShoppingBag,
      tone: "blue",
      size: "lg",
      loading: welcome.isLoading,
    },
    {
      key: "aov",
      label: "متوسط قيمة الطلب (AOV)",
      value: formatMoney(aovCents, currency),
      icon: CreditCard,
      tone: "green",
      size: "lg",
      loading: overview.isLoading || welcome.isLoading,
    },
  ];

  const secondaryKpis: KpiDef[] = [
    {
      key: "vendors",
      label: "بائع نشط على المنصة",
      value: formatNumber(overview.data?.vendors?.approved),
      icon: Store,
      tone: "purple",
      loading: overview.isLoading,
    },
    {
      key: "users",
      label: "عملاء مسجلين",
      value: formatNumber(overview.data?.users?.total),
      icon: Users,
      tone: "green",
      loading: overview.isLoading,
    },
    {
      key: "payouts",
      label: "مدفوعات معلقة للبائعين",
      value: formatMoney(
        payoutsTotal.data?.amountCents,
        payoutsTotal.data?.currency ?? currency,
      ),
      icon: CreditCard,
      tone: "pink",
      loading: payoutsTotal.isLoading,
    },
    {
      key: "kyc",
      label: "طلبات KYC قيد المراجعة",
      value: formatNumber(pendingKyc),
      icon: ShieldCheck,
      tone: "amber",
      loading: overview.isLoading && welcome.isLoading,
    },
  ];

  return (
    <div className="space-y-6">
      <WelcomeBanner
        title={`أهلاً ${adminName}، منصتك بتنمو بقوة`}
        description={`إليك نظرة سريعة على مؤشرات السوق ونشاط العمليات ليوم ${todayArabic()}. ${bannerDescription}`}
        primaryAction={{
          label: "مراجعة طلبات KYC",
          href: "/verifications",
          icon: ShieldCheck,
        }}
        secondaryAction={{
          label: "سجل العمليات",
          href: "/audit-logs",
          icon: ClipboardCheck,
        }}
      />

      <ActionStrip
        pendingKyc={pendingKyc}
        pendingPayoutsCount={pendingPayoutsCount}
        criticalAlerts={criticalAlerts}
        failedQueueJobs={failedQueueJobs}
      />

      <SectionAnchorNav sections={ANCHOR_SECTIONS} activeId={activeSection} />

      <section id="overview" className="scroll-mt-32 space-y-6">
        <KpiGrid items={headlineKpis} columns="xl:grid-cols-4" />
        <KpiGrid items={secondaryKpis} columns="xl:grid-cols-4" />

        <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
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
        </div>
      </section>

      <section id="financials" className="scroll-mt-32 space-y-6">
        <SectionHeader title="المالية والعمولات" />
        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard
            id="billing-cycle"
            title="دورة الفوترة الحالية"
            description={welcome.data?.currency ?? currency}
          >
            <BillingCycleCard />
          </SectionCard>
          <CommissionRatesCard />
        </div>
        <PendingPayoutsCard />
      </section>

      <section id="sellers" className="scroll-mt-32 space-y-6">
        <SectionHeader title="أداء البائعين" />
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <TopVendorsCard />
          <VendorGeoCard />
        </div>
      </section>

      <section id="system" className="scroll-mt-32 space-y-6">
        <SectionHeader title="صحة النظام" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={AlertTriangle}
            tone="rose"
            value={formatNumber(totalAlerts)}
            label="تحذيرات وتحقيقات نشطة"
            loading={activeAlerts.isLoading && welcome.isLoading}
          />
          <KpiCard
            icon={Activity}
            tone={systemHealth.data?.overall === "OK" ? "teal" : "rose"}
            value={systemHealth.data?.overall === "OK" ? "ممتاز" : "يحتاج فحص"}
            label="الحالة العامة للخدمات"
            loading={systemHealth.isLoading}
            footer={
              systemHealth.data?.checkedAt ? (
                <span>
                  آخر فحص:{" "}
                  {new Date(systemHealth.data.checkedAt).toLocaleTimeString("ar-EG-u-nu-latn")}
                </span>
              ) : null
            }
          />
          <KpiCard
            icon={ShieldCheck}
            tone="amber"
            value={formatNumber(pendingKyc)}
            label="KYC قيد المراجعة"
            loading={overview.isLoading && welcome.isLoading}
          />
          <KpiCard
            icon={Wrench}
            tone={failedQueueJobs > 0 ? "rose" : "teal"}
            value={formatNumber(failedQueueJobs)}
            label="وظائف فشلت في الطوابير"
            loading={queues.isLoading}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
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
        </div>

        <SectionCard
          id="queues"
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
            <ul className="space-y-2.5">
              {queueSummary.map((queue, index) => (
                <li
                  key={String(queue.name ?? index)}
                  className="flex items-center justify-between rounded-xl border border-border p-3"
                >
                  <div>
                    <div className="text-sm font-bold text-ink-strong">
                      {String(queue.name ?? `طابور ${index + 1}`)}
                    </div>
                    <div className="mt-0.5 text-[11px] text-ink-muted">
                      انتظار: {formatNumber(queue.waiting ?? 0)} • فشل:{" "}
                      {formatNumber(queue.failed ?? 0)}
                    </div>
                  </div>
                  <a
                    href="/ops/queues"
                    className="rounded-xl bg-brand-teal-50 px-3 py-1.5 text-[11px] font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
                  >
                    فتح
                  </a>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>

      <section id="vendors" className="scroll-mt-32 space-y-6">
        <SectionHeader title="البائعون" />
        <RecentVendorsTable />
      </section>

      <section id="funnel" className="scroll-mt-32 space-y-6">
        <SectionHeader title="مسار التحويل" />
        <SectionCard
          title="قمع الزيارات"
          description="من زيارة الصفحة إلى إكمال الطلب"
        >
          <FunnelCard />
        </SectionCard>
      </section>
    </div>
  );
}

function KpiGrid({
  items,
  columns = "xl:grid-cols-4",
}: {
  items: Array<{
    key: string;
    label: string;
    value: React.ReactNode;
    icon: LucideIcon;
    tone: KpiTone;
    trend?: { direction: "up" | "down"; label: string } | null;
    footer?: React.ReactNode;
    size?: "md" | "lg";
    loading?: boolean;
  }>;
  columns?: string;
}) {
  return (
    <div className={cn(`grid gap-4 sm:grid-cols-2`, columns)}>
      {items.map((item) => (
        <KpiCard
          key={item.key}
          icon={item.icon}
          tone={item.tone}
          value={item.value}
          label={item.label}
          trend={item.trend ?? null}
          footer={item.footer}
          size={item.size}
          loading={item.loading}
        />
      ))}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <header className="flex items-center gap-3">
      <h2 className="text-[18px] font-extrabold text-ink-strong">{title}</h2>
      <div className="h-px flex-1 bg-border" />
    </header>
  );
}
