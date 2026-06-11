"use client";

import { useCurrentAdmin } from "@/features/auth/use-current-admin";
import {
  hasPermission,
  type AdminPermission,
} from "@/lib/auth/permissions";

export function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: AdminPermission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { data: admin } = useCurrentAdmin();

  if (!hasPermission(admin, permission)) {
    return fallback;
  }

  return children;
}
