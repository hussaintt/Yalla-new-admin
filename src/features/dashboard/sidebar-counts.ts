"use client";

import { useQuery } from "@tanstack/react-query";

import { adminApi } from "@/lib/api/admin-client";

export type SidebarCounts = {
  vendors: number;
  verifications: number;
  products: number;
  orders: number;
  billing: number;
  notifications: number;
};

const EMPTY: SidebarCounts = {
  vendors: 0,
  verifications: 0,
  products: 0,
  orders: 0,
  billing: 0,
  notifications: 0,
};

export function useSidebarCounts() {
  return useQuery({
    queryKey: ["sidebar", "counts"] as const,
    queryFn: () => adminApi<Partial<SidebarCounts>>("/api/admin/counts"),
    select: (data) => ({ ...EMPTY, ...data }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
