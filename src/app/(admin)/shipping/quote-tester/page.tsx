import { ShippingQuoteTesterPage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function ShippingQuoteTesterRoute() {
  await requirePagePermission("settings:write");
  return <ShippingQuoteTesterPage />;
}
