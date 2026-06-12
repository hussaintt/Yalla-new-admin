import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import { BillingPaymentsPage } from "@/features/billing/billing-payments-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function BillingPaymentsRoute() {
  await requirePagePermission("billing:write");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل المدفوعات" />}>
      <BillingPaymentsPage />
    </Suspense>
  );
}
