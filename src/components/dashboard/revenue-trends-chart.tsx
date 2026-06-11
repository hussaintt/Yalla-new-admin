"use client";

import * as React from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ErrorState, LoadingState } from "@/components/state/async-states";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRevenueTrends } from "@/features/analytics/use-revenue-trends";
import type { RevenueTrendsPoint } from "@/lib/api/types";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const intervalLabels: Record<"daily" | "weekly", string> = {
  daily: "يومي",
  weekly: "أسبوعي",
};

type Interval = keyof typeof intervalLabels;

function toChartData(series: RevenueTrendsPoint[]) {
  return series.map((p) => ({
    date: p.date,
    gross: Math.round((p.grossCents ?? 0) / 100),
    payout: Math.round((p.payoutCents ?? 0) / 100),
    commission: Math.round((p.commissionCents ?? 0) / 100),
  }));
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const gross = payload.find((p) => p.dataKey === "gross")?.value ?? 0;
  const payout = payload.find((p) => p.dataKey === "payout")?.value ?? 0;
  const commission = payload.find((p) => p.dataKey === "commission")?.value ?? 0;
  return (
    <div className="min-w-[170px] rounded-lg bg-ink-strong p-3 text-xs text-white shadow-lg">
      <div className="mb-1.5 text-[10px] text-[#ccebe6]">{label}</div>
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="text-[#ccebe6]">إجمالي المبيعات</span>
        <span className="font-extrabold">{formatMoney(gross * 100)}</span>
      </div>
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="text-[#ccebe6]">صافي البائعين</span>
        <span className="font-extrabold text-brand-teal-600">
          {formatMoney(payout * 100)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="text-[#ccebe6]">عمولة المنصة</span>
        <span className="font-extrabold text-brand-orange">
          {formatMoney(commission * 100)}
        </span>
      </div>
    </div>
  );
}

export function RevenueTrendsChart({ className }: { className?: string }) {
  const [interval, setInterval] = React.useState<Interval>("daily");
  const query = useRevenueTrends(interval);
  const chartData = React.useMemo(
    () => toChartData(query.data?.data ?? []),
    [query.data],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={interval}
          onValueChange={(value) => setInterval(value as Interval)}
        >
          <TabsList>
            {(Object.keys(intervalLabels) as Interval[]).map((key) => (
              <TabsTrigger key={key} value={key}>
                {intervalLabels[key]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary" /> إجمالي المبيعات (GMV)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-brand-teal-600" /> صافي أرباح البائعين
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-brand-orange" /> عمولة المنصة
        </span>
      </div>

      <div className="h-72 w-full">
        {query.isLoading ? (
          <LoadingState label="جار تحميل اتجاهات الإيراد" />
        ) : query.isError ? (
          <ErrorState message={query.error.message} />
        ) : chartData.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-ink-muted">
            لا توجد بيانات بعد.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--ink-soft)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                content={({ active, payload, label }) => (
                  <ChartTooltip
                    active={active}
                    payload={payload as never}
                    label={String(label ?? "")}
                  />
                )}
              />
              <Legend wrapperStyle={{ display: "none" }} />
              <Bar
                dataKey="gross"
                fill="var(--primary)"
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="payout"
                fill="var(--accent)"
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
              />
              <Line
                type="monotone"
                dataKey="commission"
                stroke="var(--warning)"
                strokeWidth={2.5}
                dot={{ r: 3, stroke: "var(--card)", strokeWidth: 2, fill: "var(--warning)" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
