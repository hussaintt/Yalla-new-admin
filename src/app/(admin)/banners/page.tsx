import { Suspense } from "react";

import { BannersPage } from "@/features/resources/admin-resource-pages";
import { LoadingState } from "@/components/state/async-states";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function BannersRoute() {
  await requirePagePermission("marketing:write");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل البانرات" />}>
      <BannersPage />
    </Suspense>
  );
}
