import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import { MaintenancePage } from "@/features/settings/maintenance-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function MaintenanceRoute() {
  await requirePagePermission("settings:write");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل الإعدادات" />}>
      <MaintenancePage />
    </Suspense>
  );
}
