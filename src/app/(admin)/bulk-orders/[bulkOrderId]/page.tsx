import { BulkOrderDetailPage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function BulkOrderDetailRoute({
  params,
}: {
  params: Promise<{ bulkOrderId: string }>;
}) {
  const { bulkOrderId } = await params;
  await requirePagePermission("orders:read");

  return <BulkOrderDetailPage bulkOrderId={bulkOrderId} />;
}
