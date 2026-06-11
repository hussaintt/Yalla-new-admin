import { Suspense } from "react";

import { CatalogPage } from "@/features/resources/admin-resource-pages";
import { LoadingState } from "@/components/state/async-states";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function CatalogRoute() {
  await requirePagePermission("catalog:write");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل الكتالوج" />}>
      <CatalogPage />
    </Suspense>
  );
}
