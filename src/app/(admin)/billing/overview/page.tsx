import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import { BillingOverviewPage } from "@/features/billing/billing-overview-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function BillingOverviewRoute() {
  await requirePagePermission("billing:write");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل نظرة عامة على الفوترة" />}>
      <BillingOverviewPage />
    </Suspense>
  );
}
