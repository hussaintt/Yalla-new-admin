import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import { BillingAccountsPage } from "@/features/billing/billing-accounts-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function BillingVendorsRoute() {
  await requirePagePermission("billing:write");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل حسابات البائعين" />}>
      <BillingAccountsPage />
    </Suspense>
  );
}
