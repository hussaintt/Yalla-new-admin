import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import { BillingInvoicesPage } from "@/features/billing/billing-invoices-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function BillingInvoicesRoute() {
  await requirePagePermission("billing:write");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل الفواتير" />}>
      <BillingInvoicesPage />
    </Suspense>
  );
}
