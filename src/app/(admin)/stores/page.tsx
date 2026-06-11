import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import StoresPage from "@/features/stores/stores-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function StoresRoute() {
  await requirePagePermission("vendors:read");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل المتاجر" />}>
      <StoresPage />
    </Suspense>
  );
}
