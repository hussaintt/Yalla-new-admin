import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import VendorsPage from "@/features/vendors/vendors-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function VendorsRoute() {
  await requirePagePermission("vendors:read");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل البائعين" />}>
      <VendorsPage />
    </Suspense>
  );
}
