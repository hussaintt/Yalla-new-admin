import { Suspense } from "react";

import { AuditLogsPage } from "@/features/resources/admin-resource-pages";
import { LoadingState } from "@/components/state/async-states";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function AuditLogsRoute() {
  await requirePagePermission("audit:read");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل سجل التدقيق" />}>
      <AuditLogsPage />
    </Suspense>
  );
}
