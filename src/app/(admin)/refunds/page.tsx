import { Suspense } from "react";

import { RefundsPage } from "@/features/resources/admin-resource-pages";
import { LoadingState } from "@/components/state/async-states";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function RefundsRoute() {
  await requirePagePermission("refunds:write");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل الاستردادات" />}>
      <RefundsPage />
    </Suspense>
  );
}
