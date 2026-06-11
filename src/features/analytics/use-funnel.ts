"use client";

import { useQuery } from "@tanstack/react-query";

import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { FunnelResponse } from "@/lib/api/types";

export function useFunnel() {
  return useQuery({
    queryKey: queryKeys.dashboard.funnel,
    queryFn: () => adminApi<FunnelResponse>(adminPaths.analyticsFunnel()),
  });
}
