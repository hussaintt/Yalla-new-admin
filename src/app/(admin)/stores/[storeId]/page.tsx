import { StoreDetailPage } from "@/features/stores/store-detail-page";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function StorePage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  await requirePagePermission("vendors:read");
  return <StoreDetailPage vendorId={storeId} />;
}
