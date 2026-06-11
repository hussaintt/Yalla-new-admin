import { PaymentDetailPage } from "@/features/resources/admin-resource-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function PaymentDetailRoute({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;
  await requirePagePermission("payments:read");

  return <PaymentDetailPage paymentId={paymentId} />;
}
