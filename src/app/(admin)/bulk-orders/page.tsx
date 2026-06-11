import { Suspense } from "react";

import { BulkOrdersPage } from "@/features/resources/admin-resource-pages";
import { LoadingState } from "@/components/state/async-states";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function BulkOrdersRoute() {
  await requirePagePermission("orders:read");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل طلبات الجملة" />}>
      <BulkOrdersPage />
    </Suspense>
  );
}
