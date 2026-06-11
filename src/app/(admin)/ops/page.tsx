import { Suspense } from "react";

import { OpsPage } from "@/features/resources/admin-resource-pages";
import { LoadingState } from "@/components/state/async-states";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function OpsRoute() {
  await requirePagePermission("ops:read");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل تشغيل النظام" />}>
      <OpsPage />
    </Suspense>
  );
}
