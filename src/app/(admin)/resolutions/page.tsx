import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import ResolutionsPage from "@/features/resolutions/resolutions-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function ResolutionsRoute() {
  await requirePagePermission("orders:write");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل الحالات" />}>
      <ResolutionsPage />
    </Suspense>
  );
}
