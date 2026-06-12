import { Suspense } from "react";

import { LoadingState } from "@/components/state/async-states";
import { VendorDetailPage } from "@/features/vendors/vendor-detail-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function VendorDetailRoute({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = await params;
  await requirePagePermission("vendors:read");

  return (
    <Suspense fallback={<LoadingState label="جار تحميل بيانات البائع" />}>
      <VendorDetailPage vendorId={vendorId} />
    </Suspense>
  );
}
