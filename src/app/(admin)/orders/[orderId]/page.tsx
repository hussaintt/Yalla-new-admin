import { OrderDetailPage } from "@/features/resources/admin-resource-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function OrderDetailRoute({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  await requirePagePermission("orders:read");
  return <OrderDetailPage orderId={orderId} />;
}
