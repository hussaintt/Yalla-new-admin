import { Suspense } from "react";

import { PaymentsPage } from "@/features/resources/admin-resource-pages";
import { LoadingState } from "@/components/state/async-states";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function PaymentsRoute() {
  await requirePagePermission("payments:read");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل المدفوعات" />}>
      <PaymentsPage />
    </Suspense>
  );
}
