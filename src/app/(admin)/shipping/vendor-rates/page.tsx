import { ShippingVendorRatesPage } from "@/features/resources/remaining-admin-pages";
import { requirePagePermission } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export default async function ShippingVendorRatesRoute() {
  await requirePagePermission("settings:write");
  return <ShippingVendorRatesPage />;
}
