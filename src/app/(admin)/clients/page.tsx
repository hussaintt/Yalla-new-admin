import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import ClientsPage from "@/features/clients/clients-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function ClientsRoute() {
  await requirePagePermission("users:read");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل العملاء" />}>
      <ClientsPage />
    </Suspense>
  );
}
