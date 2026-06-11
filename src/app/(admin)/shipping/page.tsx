import { Suspense } from "react";

import { ShippingPage } from "@/features/resources/admin-resource-pages";
import { LoadingState } from "@/components/state/async-states";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function ShippingRoute() {
  await requirePagePermission("settings:write");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل الشحن" />}>
      <ShippingPage />
    </Suspense>
  );
}
