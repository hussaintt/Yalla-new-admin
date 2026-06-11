"use client";

import { useQuery } from "@tanstack/react-query";

import { adminApi } from "@/lib/api/admin-client";
import { queryKeys } from "@/lib/api/query-keys";
import type { AdminUser } from "@/lib/auth/permissions";

export function useCurrentAdmin() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => adminApi<AdminUser>("/api/auth/me"),
  });
}
