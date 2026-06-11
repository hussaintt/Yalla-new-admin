import { VendorDetailPage } from "@/features/vendors/vendor-detail-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function VendorPage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = await params;
  await requirePagePermission("vendors:read");
  return <VendorDetailPage vendorId={vendorId} />;
}
