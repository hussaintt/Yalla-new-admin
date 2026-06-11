import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import { requirePagePermission } from "@/lib/auth/server-session";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardRoute() {
  await requirePagePermission("dashboard:read");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل لوحة التحكم" />}>
      <DashboardClient />
    </Suspense>
  );
}
