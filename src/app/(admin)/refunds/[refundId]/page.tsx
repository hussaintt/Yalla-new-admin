import { RefundDetailPage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function RefundDetailRoute({
  params,
}: {
  params: Promise<{ refundId: string }>;
}) {
  const { refundId } = await params;
  await requirePagePermission("refunds:write");

  return <RefundDetailPage refundId={refundId} />;
}
