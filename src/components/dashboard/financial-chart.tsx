"use client";

import * as React from "react";
import { Download } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FinancialChartData, FinancialChartPoint } from "@/lib/api/types";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const periodLabels: Record<"week" | "month" | "quarter" | "year", string> = {
  week: "أسبوع",
  month: "شهر",
  quarter: "ربع سنة",
  year: "سنة",
};

type Period = keyof typeof periodLabels;

function toChartData(series: FinancialChartPoint[]) {
  return series.map((p) => ({
    label: p.label,
    gmv: Math.round((p.gmvCents ?? 0) / 100),
    commission: Math.round((p.commissionCents ?? 0) / 100),
    net: Math.round((p.netCents ?? 0) / 100),
  }));
}

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
  currency: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const gmv = payload.find((p) => p.dataKey === "gmv")?.value ?? 0;
  const commission = payload.find((p) => p.dataKey === "commission")?.value ?? 0;
  const net = payload.find((p) => p.dataKey === "net")?.value ?? 0;
  return (
    <div className="min-w-[170px] rounded-lg bg-ink-strong p-3 text-xs text-white shadow-lg">
      <div className="mb-1.5 text-[10px] text-[#ccebe6]">{label}</div>
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="text-[#ccebe6]">المبيعات</span>
        <span className="font-extrabold">{formatMoney(gmv * 100, currency)}</span>
      </div>
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="text-[#ccebe6]">العمولة</span>
        <span className="font-extrabold text-brand-orange">
          {formatMoney(commission * 100, currency)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="text-[#ccebe6]">صافي</span>
        <span className="font-extrabold text-brand-teal-600">
          {formatMoney(net * 100, currency)}
        </span>
      </div>
    </div>
  );
}

export function FinancialChart({
  data,
  className,
  onPeriodChange,
  onExport,
}: {
  data?: FinancialChartData;
  className?: string;
  onPeriodChange?: (period: Period) => void;
  onExport?: () => void;
}) {
  const [period, setPeriod] = React.useState<Period>(data?.period ?? "month");
  const series = React.useMemo(() => data?.points ?? [], [data?.points]);
  const chartData = React.useMemo(() => toChartData(series), [series]);
  const currency = data?.currency ?? "EGP";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={period}
          onValueChange={(value) => {
            const next = value as Period;
            setPeriod(next);
            onPeriodChange?.(next);
          }}
        >
          <TabsList>
            {(Object.keys(periodLabels) as Period[]).map((key) => (
              <TabsTrigger key={key} value={key}>
                {periodLabels[key]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button
          variant="secondary"
          size="sm"
          onClick={onExport}
          className="bg-brand-teal-50 text-primary hover:bg-primary hover:text-primary-foreground"
        >
          <Download className="size-3.5" />
          تصدير
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary" /> إجمالي المبيعات (GMV)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-brand-orange" /> عمولة المنصة
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-brand-teal-600" /> صافي أرباح البائعين
        </span>
      </div>

      <div className="h-72 w-full">
        {chartData.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-ink-muted">
            لا توجد بيانات بعد.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="fin-gmv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fin-commission" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--warning)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--warning)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
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
                    currency={currency}
                  />
                )}
              />
              <Legend wrapperStyle={{ display: "none" }} />
              <Area
                type="monotone"
                dataKey="gmv"
                stroke="var(--primary)"
                strokeWidth={2.5}
                fill="url(#fin-gmv)"
                dot={{ r: 3, stroke: "var(--card)", strokeWidth: 2, fill: "var(--primary)" }}
                activeDot={{ r: 5 }}
              />
              <Area
                type="monotone"
                dataKey="commission"
                stroke="var(--warning)"
                strokeWidth={2.5}
                fill="url(#fin-commission)"
                dot={{ r: 3, stroke: "var(--card)", strokeWidth: 2, fill: "var(--warning)" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="net"
                stroke="var(--accent)"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
