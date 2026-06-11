import { Suspense } from "react";

import { OrdersPage } from "@/features/resources/admin-resource-pages";
import { LoadingState } from "@/components/state/async-states";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function OrdersRoute() {
  await requirePagePermission("orders:read");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل الطلبات" />}>
      <OrdersPage />
    </Suspense>
  );
}
