import { PromotionDetailPage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function PromotionDetailRoute({
  params,
}: {
  params: Promise<{ promotionId: string }>;
}) {
  const { promotionId } = await params;
  await requirePagePermission("marketing:write");

  return <PromotionDetailPage promotionId={promotionId} />;
}
