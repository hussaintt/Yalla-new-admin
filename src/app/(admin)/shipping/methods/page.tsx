import { ShippingMethodsPage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function ShippingMethodsRoute() {
  await requirePagePermission("settings:write");
  return <ShippingMethodsPage />;
}
