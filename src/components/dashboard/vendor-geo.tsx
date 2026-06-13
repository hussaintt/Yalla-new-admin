"use client";

import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { GeoRow } from "@/components/ui/geo-row";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { VendorGeoBreakdown } from "@/lib/api/types";

function formatCount(value: number) {
  return new Intl.NumberFormat("ar-EG-u-nu-latn").format(value);
}

export function VendorGeoCard() {
  const geo = useQuery({
    queryKey: queryKeys.dashboard.vendorGeo("EG", 10),
    queryFn: () => adminApi<VendorGeoBreakdown>(adminPaths.vendorsGeoBreakdown("EG", 10)),
  });

  const max = geo.data?.data?.reduce((acc, row) => Math.max(acc, row.vendorCount ?? 0), 0) ?? 0;

  return (
    <SectionCard
      title="التوزيع الجغرافي للبائعين"
      description="حسب المحافظات"
      actions={
        <Button variant="secondary" size="sm" className="bg-brand-teal-50 text-primary hover:bg-primary hover:text-primary-foreground">
          خريطة
        </Button>
      }
    >
      {geo.isLoading ? (
        <LoadingState label="جار التحميل" />
      ) : geo.isError ? (
        <ErrorState message={geo.error.message} />
      ) : geo.data && geo.data.data.length > 0 ? (
        <div className="space-y-3.5">
          {geo.data.data.map((row) => (
            <GeoRow
              key={row.regionCode}
              name={row.regionLabel}
              value={`${formatCount(row.vendorCount)} بائع (${row.pct}%)`}
              fillPct={max ? (row.vendorCount / max) * 100 : 0}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-muted">لا توجد بيانات جغرافية.</p>
      )}
    </SectionCard>
  );
}
