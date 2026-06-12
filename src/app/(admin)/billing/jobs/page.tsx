import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import { BillingJobsPage } from "@/features/billing/billing-jobs-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function BillingJobsRoute() {
  await requirePagePermission("billing:write");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل مهام الفوترة" />}>
      <BillingJobsPage />
    </Suspense>
  );
}
