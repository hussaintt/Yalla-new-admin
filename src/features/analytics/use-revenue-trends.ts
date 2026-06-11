"use client";

import { useQuery } from "@tanstack/react-query";

import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { RevenueTrendsResponse } from "@/lib/api/types";

export function useRevenueTrends(
  interval: "daily" | "weekly" = "daily",
  from?: string,
  to?: string,
) {
  return useQuery({
    queryKey: queryKeys.dashboard.revenueTrends(interval, from, to),
    queryFn: () =>
      adminApi<RevenueTrendsResponse>(
        adminPaths.analyticsRevenueTrends(interval, from, to),
      ),
  });
}
