import { Suspense } from "react";

import { PromotionsPage } from "@/features/promotions/promotions-page";
import { LoadingState } from "@/components/state/async-states";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function PromotionsRoute() {
  await requirePagePermission("marketing:write");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل الكوبونات" />}>
      <PromotionsPage />
    </Suspense>
  );
}
