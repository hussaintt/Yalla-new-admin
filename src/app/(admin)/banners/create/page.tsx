import { BannerCreatePage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function BannerCreateRoute() {
  await requirePagePermission("marketing:write");
  return <BannerCreatePage />;
}
