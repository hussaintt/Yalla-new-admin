import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import { SubscriptionsPage } from "@/features/subscriptions/subscriptions-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function SubscriptionsRoute() {
  await requirePagePermission("subscriptions:read");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل الاشتراكات" />}>
      <SubscriptionsPage />
    </Suspense>
  );
}
