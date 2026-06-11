import { PromotionCreatePage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function PromotionCreateRoute() {
  await requirePagePermission("marketing:write");
  return <PromotionCreatePage />;
}
