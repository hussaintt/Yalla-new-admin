"use client";

import { ErrorState, LoadingState } from "@/components/state/async-states";
import { useFunnel } from "@/features/analytics/use-funnel";
import { cn } from "@/lib/utils";

type Stage = { key: string; label: string; value: number };

function formatNumber(value: number) {
  if (!value) return "—";
  return new Intl.NumberFormat("ar-EG").format(value);
}

function ratio(value: number, base: number) {
  if (!base) return 0;
  return Math.round((value / base) * 100);
}

export function FunnelCard() {
  const query = useFunnel();
  const data = query.data;
  const baseValue = data?.pageViews ?? 1;
  const stages: Stage[] = data
    ? [
        { key: "registrations", label: "تسجيلات", value: data.registrations },
        { key: "cartAdditions", label: "إضافة للسلة", value: data.cartAdditions },
        {
          key: "checkoutInitiations",
          label: "بدء الدفع",
          value: data.checkoutInitiations,
        },
        { key: "completedOrders", label: "طلبات مكتملة", value: data.completedOrders },
      ]
    : [];

  return (
    <div className="space-y-4">
      {query.isLoading ? (
        <LoadingState label="جار تحميل القمع" />
      ) : query.isError ? (
        <ErrorState message={query.error.message} />
      ) : (
        <>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="text-[11px] text-ink-muted">إجمالي الزيارات</div>
            <div className="text-2xl font-extrabold text-ink-strong">
              {formatNumber(baseValue)}
            </div>
            <div className="mt-0.5 text-[11px] text-ink-muted">
              معدل التحويل إلى طلب: {ratio(data?.completedOrders ?? 0, baseValue)}%
            </div>
          </div>

          <ol className="space-y-2.5">
            {stages.map((stage, index) => {
              const pct = ratio(stage.value, baseValue);
              const next = stages[index + 1];
              const drop =
                next && stage.value >= next.value
                  ? Math.round(((stage.value - next.value) / stage.value) * 100)
                  : null;
              return (
                <li key={stage.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-bold text-ink-strong">{stage.label}</span>
                    <span className="text-ink-muted">
                      {formatNumber(stage.value)} • {pct}%
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        index === stages.length - 1
                          ? "bg-success"
                          : index === 0
                            ? "bg-primary"
                            : "bg-brand-orange",
                      )}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  {drop !== null ? (
                    <div className="mt-0.5 text-[10px] text-ink-muted">
                      انخفاض {drop}% للمرحلة التالية
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
