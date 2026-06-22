"use client";

import { useState } from "react";

import { SectionCard } from "@/components/ui/section-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VendorRow } from "@/components/ui/vendor-row";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { VendorRankingRow } from "@/lib/api/types";
import { formatMoney, localizedText } from "@/lib/formatters";
import { useQuery } from "@tanstack/react-query";

const gradients = [
  "bg-gradient-to-br from-primary to-brand-teal-600",
  "bg-gradient-to-br from-brand-orange to-brand-yellow-300",
  "bg-gradient-to-br from-brand-purple to-brand-pink",
  "bg-gradient-to-br from-brand-blue to-brand-cyan",
  "bg-gradient-to-br from-brand-green to-brand-teal-600",
  "bg-gradient-to-br from-brand-rose to-brand-orange",
];

function logoText(row: VendorRankingRow) {
  const name = localizedText(row.vendor?.displayName, row.vendor?.slug ?? "—", "ar");
  const first = name.split(/\s+/).filter(Boolean)[0] ?? "—";
  return first.slice(0, 1);
}

export function TopVendorsCard() {
  const [tab, setTab] = useState<"revenue" | "orders" | "rating">("revenue");

  const ranking = useQuery({
    queryKey: queryKeys.dashboard.vendorRanking(30, 5),
    queryFn: () =>
      adminApi<VendorRankingRow[]>(adminPaths.analyticsVendorRanking(30, 5)),
  });

  return (
    <SectionCard
      title="أفضل البائعين هذا الشهر"
      description="ترتيب حسب إجمالي المبيعات"
      actions={
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="revenue">مبيعات</TabsTrigger>
            <TabsTrigger value="orders">طلبات</TabsTrigger>
            <TabsTrigger value="rating">تقييم</TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      {ranking.isLoading ? (
        <LoadingState label="جار التحميل" />
      ) : ranking.isError ? (
        <ErrorState message={ranking.error.message} />
      ) : ranking.data && ranking.data.length > 0 ? (
        <div className="space-y-1">
          {ranking.data.map((row, index) => (
            <VendorRow
              key={row.vendor?.publicId ?? row.vendor?.slug ?? index}
              rank={index + 1}
              avatar={logoText(row)}
              avatarClassName={gradients[index % gradients.length]}
              logoUrl={row.vendor?.logoUrl}
              name={localizedText(row.vendor?.displayName, row.vendor?.slug ?? "—", "ar")}
              category={`${row.vendor?.status ?? "—"} • ${row.splitCount ?? 0} عملية`}
              revenue={formatMoney(row.totalCents, "EGP")}
              orders={`${row.splitCount ?? 0} طلب`}
              sparkline={[4, 6, 5, 7, 6, 8, 7, 9]}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-muted">لا توجد مبيعات بائعين بعد.</p>
      )}
    </SectionCard>
  );
}
