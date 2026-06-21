import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import StoreEditsPage from "@/features/store-edits/store-edits-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function StoreEditsRoute() {
  await requirePagePermission("stores:read");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل تعديلات المتاجر" />}>
      <StoreEditsPage />
    </Suspense>
  );
}
