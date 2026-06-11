import { Suspense } from "react";

import { PromotionsPage } from "@/features/resources/admin-resource-pages";
import { LoadingState } from "@/components/state/async-states";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function PromotionsRoute() {
  await requirePagePermission("marketing:write");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل العروض" />}>
      <PromotionsPage />
    </Suspense>
  );
}
