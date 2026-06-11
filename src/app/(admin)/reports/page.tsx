import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import { ReportsPage } from "@/features/reports/reports-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function ReportsRoute() {
  await requirePagePermission("audit:read");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل التقارير" />}>
      <ReportsPage />
    </Suspense>
  );
}
