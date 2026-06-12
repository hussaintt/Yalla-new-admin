import { Suspense } from "react";

import { ProductsPage } from "@/features/resources/admin-resource-pages";
import { LoadingState } from "@/components/state/async-states";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function ProductsRoute() {
  await requirePagePermission("products:review");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل المنتجات" />}>
      <ProductsPage />
    </Suspense>
  );
}
