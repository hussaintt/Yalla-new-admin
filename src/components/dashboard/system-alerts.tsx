"use client";

import { SectionCard } from "@/components/ui/section-card";
import { AlertItem, type AlertSeverity } from "@/components/ui/alert-item";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import type { SystemAlert } from "@/lib/api/types";

function severityFromTone(tone?: string): AlertSeverity {
  if (tone === "danger" || tone === "critical") return "danger";
  if (tone === "warning") return "warning";
  return "info";
}

export function SystemAlertsCard({
  alerts,
  isLoading,
  isError,
  errorMessage,
}: {
  alerts: SystemAlert[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
}) {
  return (
    <SectionCard
      title="تنبيهات تحتاج انتباهك"
      description={`${alerts.length} تنبيهات عالية الأولوية`}
    >
      {isLoading ? (
        <LoadingState label="جار التحميل" />
      ) : isError ? (
        <ErrorState message={errorMessage ?? "تعذر تحميل التنبيهات"} />
      ) : alerts.length === 0 ? (
        <p className="text-sm text-ink-muted">لا توجد تنبيهات حالياً.</p>
      ) : (
        <div className="space-y-2.5">
          {alerts.map((alert) => (
            <AlertItem
              key={alert.id}
              severity={severityFromTone(alert.severity)}
              title={alert.title}
              description={alert.description}
              time={alert.createdAt ? new Date(alert.createdAt).toLocaleString("ar-EG-u-nu-latn") : undefined}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}
