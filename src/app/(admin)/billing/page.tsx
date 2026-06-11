import { Suspense } from "react";

import { BillingPage } from "@/features/resources/admin-resource-pages";
import { LoadingState } from "@/components/state/async-states";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function BillingRoute() {
  await requirePagePermission("billing:write");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل الفوترة" />}>
      <BillingPage />
    </Suspense>
  );
}
