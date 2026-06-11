import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { LoadingState } from "@/components/state/async-states";
import { PayoutsPage } from "@/features/payouts/payouts-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function PayoutsRoute() {
  await requirePagePermission("billing:write");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل المستحقات" />}>
      <div className="space-y-6">
        <PageHeader
          title="مستحقات البائعين"
          description="متابعة مدفوعات البائعين المعلقة والمدفوعة والمرفوضة من خلال مسار الفوترة."
        />
        <PayoutsPage />
      </div>
    </Suspense>
  );
}
