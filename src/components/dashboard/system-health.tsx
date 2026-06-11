"use client";

import {
  Activity,
  Cloud,
  Database,
  HardDrive,
  Radio,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/status/status-badge";
import { HealthRow, type HealthTone } from "@/components/ui/health-row";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import type { SystemHealth, SystemHealthService } from "@/lib/api/types";

const iconMap: Record<string, React.ElementType> = {
  api_gateway: Radio,
  database: Database,
  payment_gateway: Wallet,
  notifications: Bell,
  cdn: Cloud,
  platform_uptime: Activity,
  cache: HardDrive,
  security: ShieldCheck,
};

const iconClassByKey: Record<string, string> = {
  api_gateway: "bg-success-soft text-success",
  database: "bg-success-soft text-success",
  payment_gateway: "bg-warning-soft text-warning",
  notifications: "bg-success-soft text-success",
  cdn: "bg-success-soft text-success",
  platform_uptime: "bg-success-soft text-success",
};

const toneFor = (status: string): HealthTone => {
  if (status === "WARN") return "warn";
  if (status === "DOWN") return "down";
  return "ok";
};

function HealthRows({ services }: { services: SystemHealthService[] }) {
  return (
    <div className="divide-y divide-border-soft">
      {services.map((service) => {
        const Icon = iconMap[service.key] ?? Activity;
        return (
          <HealthRow
            key={service.key}
            icon={Icon}
            iconClassName={iconClassByKey[service.key] ?? "bg-success-soft text-success"}
            name={service.label}
            meta={
              <span className="flex items-center gap-2">
                {service.latencyMs != null ? <span>استجابة {service.latencyMs}ms</span> : null}
                {service.uptimePct != null ? <span>• {service.uptimePct}% uptime</span> : null}
                {service.meta ? <span>• {service.meta}</span> : null}
              </span>
            }
            status={toneFor(service.status)}
            pill={
              service.key === "platform_uptime" && service.uptimePct != null
                ? `${service.uptimePct}%`
                : undefined
            }
          />
        );
      })}
    </div>
  );
}

export function SystemHealthCard({
  data,
  isLoading,
  isError,
  errorMessage,
}: {
  data?: SystemHealth;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
}) {
  const overall = data?.overall ?? "OK";
  return (
    <SectionCard
      title="صحة النظام"
      description="حالة الخدمات لحظة بلحظة"
      actions={
        <StatusBadge status={overall === "OK" ? "ACTIVE" : overall === "WARN" ? "PENDING" : "SUSPENDED"} />
      }
    >
      {isLoading ? (
        <LoadingState label="جار التحميل" />
      ) : isError ? (
        <ErrorState message={errorMessage ?? "تعذر تحميل حالة النظام"} />
      ) : data && data.services.length > 0 ? (
        <HealthRows services={data.services} />
      ) : (
        <p className="text-sm text-ink-muted">لا توجد بيانات متاحة.</p>
      )}
    </SectionCard>
  );
}

function Bell(props: { className?: string }) {
  return <Activity {...props} />;
}
