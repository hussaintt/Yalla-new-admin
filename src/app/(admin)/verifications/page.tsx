import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import VerificationsPage from "@/features/kyc/verifications-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function VerificationsRoute() {
  await requirePagePermission("kyc:review");
  return (
    <Suspense fallback={<LoadingState label="جار تحميل التحقق" />}>
      <VerificationsPage />
    </Suspense>
  );
}
